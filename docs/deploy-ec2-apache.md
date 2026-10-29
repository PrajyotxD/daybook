# Deploying Daybook on EC2 + Apache + RDS (Ubuntu)

Target shape — one EC2 instance runs both the Spring Boot process (systemd, port 8080 on
loopback) and Apache (port 80/443, serves the SPA and proxies `/api`). PostgreSQL lives on RDS.

```
        Browser
           │  :80 / :443
   ┌───────▼──────────────────────────────────┐
   │ EC2  (Ubuntu 22.04 / 24.04)              │
   │                                          │
   │  Apache httpd :80                        │
   │   ├── /            → /var/www/daybook    │  static Vite build
   │   └── /api/*       → 127.0.0.1:8080      │
   │                                          │
   │  systemd: daybook.service                │
   │   └── java -jar daybook-service.jar      │
   └───────────────┬──────────────────────────┘
                   │ 5432, TLS, private subnets
          ┌────────▼─────────┐
          │  Amazon RDS      │
          │  PostgreSQL 16   │
          └──────────────────┘
```

Apache and the JVM share the host, so the browser only ever talks to one origin. That means no
CORS configuration and no exposed application port.

## Before you start

You should already have:

- An RDS PostgreSQL instance (16 preferred) and its **endpoint**.
- An EC2 instance running **Ubuntu 22.04 or 24.04**, `t3.small` or larger (2 GB RAM minimum), with
  the repo cloned.
- The security group IDs for both.

If you skipped creating a database on RDS, the instance only has the default `postgres` database.
Step 2 fixes that.

## Step 1 — Security groups

This is the step people get wrong. The database must trust the *instance*, not an IP.

**RDS security group** — inbound:

| Type | Port | Source |
| --- | --- | --- |
| PostgreSQL | 5432 | the **EC2 instance's security group** (`sg-…`), not `0.0.0.0/0` |

**EC2 security group** — inbound:

| Type | Port | Source |
| --- | --- | --- |
| SSH | 22 | your IP only |
| HTTP | 80 | `0.0.0.0/0` |
| HTTPS | 443 | `0.0.0.0/0` |

Do **not** open 8080. Apache reaches the JVM over loopback; nothing else should.

Both resources must be in the same VPC and the instance must route to the RDS subnets. If the
instance is in a public subnet and RDS is private, that is fine — same VPC is what matters.

## Step 2 — Create the database and role

RDS's master user is not the account the app should use. From the EC2 box:

```bash
sudo apt-get update && sudo apt-get install -y postgresql-client
psql "host=<RDS_ENDPOINT> port=5432 dbname=postgres user=<MASTER_USER> sslmode=require"
```

```sql
CREATE ROLE daybook LOGIN PASSWORD 'a-long-random-password';
CREATE DATABASE daybook OWNER daybook;

\c daybook
-- PostgreSQL 15+ revoked CREATE on public from PUBLIC; make the app role own the schema.
ALTER SCHEMA public OWNER TO daybook;
GRANT ALL ON SCHEMA public TO daybook;
```

Verify the exact credentials the app will use:

```bash
psql "host=<RDS_ENDPOINT> dbname=daybook user=daybook sslmode=require" \
  -c "select current_user, current_database();"
```

You do **not** create tables. Flyway applies `V1__create_entries.sql` on first boot.

## Step 3 — Install and build on the instance

```bash
cd ~/daybook                      # the cloned repo
sudo -E \
  DB_HOST=<RDS_ENDPOINT> \
  DB_NAME=daybook \
  DB_USERNAME=daybook \
  DB_PASSWORD='a-long-random-password' \
  CORS_ALLOWED_ORIGINS=https://daybook.example.com \
  DOMAIN=daybook.example.com \
  ./deploy/ec2/setup.sh
```

What it does, in order:

1. Adds 2 GB swap if the instance has under 2 GB RAM (Maven and Vite both need headroom).
2. Installs `apache2`, OpenJDK 21, git and Node 20 via `apt`.
3. Builds the jar with `./mvnw` and the SPA with `npm ci && npm run build`.
4. Creates the `daybook` system user; installs the jar to `/opt/daybook` and the SPA to
   `/var/www/daybook` (owned by `www-data`).
5. Writes `/etc/daybook/daybook.env` (mode 0600) with your credentials.
6. Installs and starts `daybook.service`.
7. Enables `proxy`, `proxy_http`, `headers` and `deflate`; installs the vhost; disables the default
   site; runs `apache2ctl configtest`; restarts Apache.
8. Opens 80/443 if `ufw` is active.
9. Waits for the API and prints the public URL.

Re-running the script is the deploy path for updates (see Operations).

### Ubuntu file layout

| What | Where |
| --- | --- |
| Vhost | `/etc/apache2/sites-available/daybook.conf` (enabled via `a2ensite daybook`) |
| Apache service | `systemctl status apache2` |
| Apache logs | `/var/log/apache2/daybook-{error,access}.log` |
| API unit | `/etc/systemd/system/daybook.service` |
| API logs | `journalctl -u daybook` |
| Jar | `/opt/daybook/daybook-service.jar` |
| Static files | `/var/www/daybook` |
| Secrets | `/etc/daybook/daybook.env` (0600 root:daybook) |

## Step 4 — Verify

```bash
systemctl status daybook --no-pager
systemctl status apache2 --no-pager
curl -s localhost:8080/actuator/health/readiness     # {"status":"UP"}
curl -s localhost/healthz                             # through Apache
curl -s localhost/api/entries/stats | head -c 200     # real data from RDS
```

Then open `http://<ec2-public-ip>/` in a browser. Create an entry and confirm it appears after a
page reload — that proves the round trip through Apache → JVM → RDS.

Check Flyway did its job:

```bash
psql "host=<RDS_ENDPOINT> dbname=daybook user=daybook sslmode=require" \
  -c "select version, description, success from flyway_schema_history;"
```

## Step 5 — Stable address and HTTPS

The public IP changes on stop/start. Allocate an Elastic IP and associate it, then point a domain
at it (an `A` record).

```bash
sudo apt-get install -y certbot python3-certbot-apache
sudo certbot --apache -d daybook.example.com --redirect
```

Certbot rewrites the vhost to add a 443 listener and an HTTP→HTTPS redirect, and installs a renewal
timer. Confirm with `systemctl list-timers | grep certbot`.

If you would rather terminate TLS elsewhere, put an ALB with an ACM certificate in front and target
the instance on port 80.

## Step 6 — Operations

| Task | Command |
| --- | --- |
| API logs | `sudo journalctl -u daybook -f` |
| Apache logs | `sudo tail -f /var/log/apache2/daybook-error.log` |
| Restart API | `sudo systemctl restart daybook` |
| Reload Apache | `sudo systemctl reload apache2` |
| Deploy an update | `cd ~/daybook && git pull && sudo -E ./deploy/ec2/setup.sh` |
| Schema version | `select version, success from flyway_schema_history order by installed_rank desc limit 1;` |

**Backups:** RDS automated backups cover the database. Take a manual snapshot before a release that
includes a migration.

**Migrations:** Flyway runs at application start. Keep migrations backwards compatible so a rollback
to the previous jar still works against the migrated schema.

**Instance sizing:** `t3.small` (2 vCPU / 2 GB) handles this workload comfortably. The build is the
memory peak; the running JVM is capped at 1 GB by `JAVA_OPTS` in the env file.

**Patching:** `sudo apt-get update && sudo apt-get upgrade -y`, or enable `unattended-upgrades` for
security patches only.

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `502 Proxy Error` | JVM not running | `systemctl status daybook`, `journalctl -u daybook -n 80` |
| `503 Service Unavailable` | Apache module or vhost not enabled | `sudo a2enmod proxy proxy_http headers deflate && sudo systemctl reload apache2` |
| `Connection to … refused` / timeout on boot | RDS security group missing the EC2 SG, or different VPC | Fix the inbound rule in Step 1 |
| `password authentication failed` | Wrong password or role name in `/etc/daybook/daybook.env` | Edit, then `systemctl restart daybook` |
| `permission denied for schema public` (Flyway) | PG 15+ schema ownership | `ALTER SCHEMA public OWNER TO daybook;` |
| `404` when refreshing `/entries` | SPA fallback missing | Ensure `FallbackResource /index.html` is inside `<Directory>` |
| Blank page, assets 404 | Wrong `DocumentRoot` | Must be `/var/www/daybook` with `index.html` at its root |
| `Permission denied` reading `/var/www/daybook` | Wrong ownership | `sudo chown -R root:www-data /var/www/daybook && sudo chmod -R 755 /var/www/daybook` |
| `Port 8080 already in use` | Stale java process | `sudo pkill -f daybook-service.jar` then restart |
| Build killed on the instance | Out of memory | Add swap (the script does this under 2 GB) or build on `t3.medium` |
| Site reachable locally, not from browser | ufw or security group | `sudo ufw status`; check inbound 80 in the EC2 SG |

Ubuntu uses AppArmor rather than SELinux, and the packaged profile for Apache does not block
outbound proxy connections — no extra step is needed there.

## Hardening checklist

- [ ] SSH restricted to your IP, key-based only (`PasswordAuthentication no`).
- [ ] `ufw` enabled, allowing only `OpenSSH` and `Apache Full`.
- [ ] RDS not publicly accessible; reachable only from the EC2 security group.
- [ ] `DB_SSLMODE=require` in the env file (default).
- [ ] `/etc/daybook/daybook.env` is `0600 root:daybook` — never committed.
- [ ] Swagger UI either kept intentionally or the three proxy blocks removed from the vhost.
- [ ] RDS automated backups enabled, retention ≥ 7 days.
- [ ] `unattended-upgrades` enabled for security patches.
