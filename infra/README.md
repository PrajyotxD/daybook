# Deploying to AWS (ECS Fargate + RDS)

One task, two containers: nginx serves the React build and proxies `/api` to the Spring Boot
container over loopback. The ALB talks only to nginx, so the browser never needs CORS and the
API port is not exposed to the internet.

```
              Internet
                 │  HTTPS :443
          ┌──────▼──────┐
          │     ALB     │  target group → :80 (ip)
          └──────┬──────┘
   ┌─────────────▼─────────────────────────────┐
   │  ECS task (awsvpc, private subnet)        │
   │  ┌──────────────┐      ┌───────────────┐  │
   │  │ web (nginx)  │─────▶│ api (Spring)  │  │
   │  │ :80          │ /api │ :8080         │  │
   │  └──────────────┘      └───────┬───────┘  │
   └────────────────────────────────┼──────────┘
                                    │ 5432 (TLS)
                            ┌───────▼────────┐
                            │  RDS PostgreSQL│
                            │  private subnet│
                            └────────────────┘
```

## 1. Database (Amazon RDS for PostgreSQL)

```bash
aws rds create-db-instance \
  --db-instance-identifier cloudblitz-daybook \
  --db-instance-class db.t4g.micro \
  --engine postgres --engine-version 16.4 \
  --allocated-storage 20 --storage-type gp3 --storage-encrypted \
  --db-name entries --master-username entries \
  --manage-master-user-password \
  --backup-retention-period 7 \
  --no-publicly-accessible \
  --vpc-security-group-ids sg-xxxxxxxx
```

- Put the instance in **private subnets** of the same VPC as the ECS service.
- Security group inbound rule: `5432` from the **ECS service security group only**.
- Enable `rds.force_ssl=1` in the parameter group and append `?sslmode=require` to `DB_HOST` usage
  if you want strict TLS (Spring's JDBC URL builder in `application-prod.yml` can be extended).
- Flyway creates the schema on first boot (`V1__create_entries.sql`). No manual DDL needed.

Store the password in SSM Parameter Store as a `SecureString`:

```bash
aws ssm put-parameter \
  --name /cloudblitz/entries/db-password \
  --type SecureString \
  --value 'super-secret' \
  --region "$AWS_REGION"
```

## 2. IAM roles

| Role | Purpose | Policies |
| --- | --- | --- |
| `ecsTaskExecutionRole` | pull images, write logs | `AmazonECSTaskExecutionRolePolicy` + `ssm:GetParameters` on `/cloudblitz/entries/*` |
| `cloudblitzEntriesTaskRole` | runtime access | none required today; add S3/SQS here later |

## 3. ECR repositories

Created automatically by `scripts/deploy.sh`, or manually:

```bash
aws ecr create-repository --repository-name cloudblitz-daybook-api --image-scanning-configuration scanOnPush=true
aws ecr create-repository --repository-name cloudblitz-daybook-web --image-scanning-configuration scanOnPush=true
```

## 4. ECS cluster, service and load balancer

```bash
aws ecs create-cluster --cluster-name cloudblitz-prod

aws logs create-log-group --log-group-name /ecs/cloudblitz-daybook

aws elbv2 create-target-group \
  --name daybook-web-tg --protocol HTTP --port 80 --target-type ip \
  --vpc-id vpc-xxxxxxxx --health-check-path /healthz \
  --health-check-interval-seconds 30 --healthy-threshold-count 2

aws ecs create-service \
  --cluster cloudblitz-prod \
  --service-name entries \
  --task-definition cloudblitz-daybook \
  --desired-count 2 \
  --launch-type FARGATE \
  --platform-version LATEST \
  --network-configuration 'awsvpcConfiguration={subnets=[subnet-a,subnet-b],securityGroups=[sg-yyyyyyyy],assignPublicIp=DISABLED}' \
  --load-balancers 'targetGroupArn=arn:aws:elasticloadbalancing:...,containerName=web,containerPort=80' \
  --health-check-grace-period-seconds 90
```

Notes:

- `assignPublicIp=DISABLED` requires a NAT gateway (or VPC endpoints for ECR, S3, CloudWatch Logs,
  and SSM) so the task can pull images.
- Keep the service in private subnets; only the ALB sits in public subnets.
- The task definition requests `1024` CPU / `2048` MB. Two containers share that budget; the JVM is
  capped at 75% of the container memory via `MaxRAMPercentage`.
- Container health checks gate traffic: `api` waits for `/actuator/health/readiness`, `web` for
  `/healthz`.

## 5. Deploy

```bash
export AWS_REGION=ap-south-1
export CLUSTER=cloudblitz-prod
export SERVICE=entries
export DB_HOST=cloudblitz-daybook.xxxx.ap-south-1.rds.amazonaws.com
export CORS_ORIGINS=https://entries.example.com

./scripts/deploy.sh
```

The script builds `linux/amd64` images, pushes them with the current git SHA, registers a new task
definition revision, forces a new deployment and waits for the service to stabilise.

## 6. Operations

- **Logs:** `/ecs/cloudblitz-daybook` (`api` and `web` streams).
- **Health:** ALB `GET /healthz` (nginx) and ECS container health on `/actuator/health/readiness`.
- **Scaling:** target-tracking on `ECSServiceAverageCPUUtilization` at 60%, min 2 / max 6.
- **Migrations:** run automatically at container start. Keep them backwards compatible so rolling
  deployments never break the previous revision.
- **Rollback:** `aws ecs update-service --task-definition cloudblitz-daybook:<previous-revision>`.

## Cost sketch (ap-south-1, on-demand)

| Resource | Spec | ≈ monthly |
| --- | --- | --- |
| Fargate | 2 tasks × 1 vCPU / 2 GB | $70 |
| RDS PostgreSQL | db.t4g.micro, 20 GB gp3 | $18 |
| ALB | 1 ALB + minimal LCU | $22 |
| NAT gateway | 1 gateway, light traffic | $35 |
| ECR + logs | small | $3 |

≈ **$150/month** for a highly available setup. A single task and a public subnet without NAT brings
it closer to $75.
