#!/usr/bin/env bash
#
# Build, push and roll out the Daybook stack to Amazon ECS (Fargate).
#
# Required environment variables:
#   AWS_REGION       e.g. ap-south-1
#   CLUSTER          ECS cluster name
#   SERVICE          ECS service name
#   DB_HOST          RDS endpoint
#   CORS_ORIGINS     public origin, e.g. https://entries.example.com
#
# Optional:
#   TAG              image tag (default: git sha)
#   DB_NAME / DB_USERNAME / DB_PASSWORD_PARAM
#
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AWS_REGION="${AWS_REGION:?set AWS_REGION}"
CLUSTER="${CLUSTER:?set CLUSTER}"
SERVICE="${SERVICE:?set SERVICE}"
DB_HOST="${DB_HOST:?set DB_HOST}"
CORS_ORIGINS="${CORS_ORIGINS:-http://localhost}"
TAG="${TAG:-$(git -C "$ROOT_DIR" rev-parse --short HEAD 2>/dev/null || echo manual)}"

ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
REGISTRY="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
API_REPO="cloudblitz-daybook-api"
WEB_REPO="cloudblitz-daybook-web"

echo "==> Account ${ACCOUNT_ID} · region ${AWS_REGION} · tag ${TAG}"

echo "==> Ensuring ECR repositories exist"
for repo in "$API_REPO" "$WEB_REPO"; do
  aws ecr describe-repositories --repository-names "$repo" --region "$AWS_REGION" >/dev/null 2>&1 ||
    aws ecr create-repository --repository-name "$repo" --region "$AWS_REGION" \
      --image-scanning-configuration scanOnPush=true >/dev/null
done

echo "==> Logging in to ECR"
aws ecr get-login-password --region "$AWS_REGION" |
  docker login --username AWS --password-stdin "$REGISTRY"

echo "==> Building images (linux/amd64)"
docker build --platform linux/amd64 -t "${REGISTRY}/${API_REPO}:${TAG}" "$ROOT_DIR/backend"
docker build --platform linux/amd64 -t "${REGISTRY}/${WEB_REPO}:${TAG}" "$ROOT_DIR/frontend"

echo "==> Pushing images"
docker push "${REGISTRY}/${API_REPO}:${TAG}"
docker push "${REGISTRY}/${WEB_REPO}:${TAG}"

echo "==> Rendering task definition"
TMP_TASK="$(mktemp)"
sed -e "s|ACCOUNT_ID|${ACCOUNT_ID}|g" \
    -e "s|REGION|${AWS_REGION}|g" \
    -e "s|TAG|${TAG}|g" \
    -e "s|RDS_ENDPOINT|${DB_HOST}|g" \
    -e "s|https://entries.example.com|${CORS_ORIGINS}|g" \
    "$ROOT_DIR/infra/ecs-task-definition.json" > "$TMP_TASK"

echo "==> Registering task definition"
TASK_DEF_ARN="$(aws ecs register-task-definition \
  --cli-input-json "file://${TMP_TASK}" \
  --region "$AWS_REGION" \
  --query 'taskDefinition.taskDefinitionArn' --output text)"
rm -f "$TMP_TASK"
echo "    ${TASK_DEF_ARN}"

echo "==> Updating service ${SERVICE}"
aws ecs update-service \
  --cluster "$CLUSTER" \
  --service "$SERVICE" \
  --task-definition "$TASK_DEF_ARN" \
  --force-new-deployment \
  --region "$AWS_REGION" >/dev/null

echo "==> Waiting for service to stabilise"
aws ecs wait services-stable --cluster "$CLUSTER" --services "$SERVICE" --region "$AWS_REGION"

echo "==> Deployed ${TAG}"
