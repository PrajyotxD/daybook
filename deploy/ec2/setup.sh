#!/usr/bin/env bash
#
# Daybook — one-shot install on Ubuntu 22.04 / 24.04 (Amazon Linux also handled).
#
#   sudo -E DB_HOST=... DB_NAME=daybook DB_USERNAME=daybook DB_PASSWORD=... \
#            CORS_ALLOWED_ORIGINS=https://daybook.example.com \
#            ./deploy/ec2/setup.sh
#
# Installs the JDK, Node and Apache; builds the API and the SPA from this
# checkout; installs the systemd unit and the Apache vhost. Safe to re-run —
# that is also the deploy path for updates (git pull && re-run).
#
set -euo pipefail

APP_USER="daybook"
APP_DIR="/opt/daybook"
WEB_DIR="/var/www/daybook"
ENV_DIR="/etc/daybook"
ENV_FILE="${ENV_DIR}/daybook.env"
JAR_NAME="daybook-service.jar"

log() { printf "\n\033[1;32m==>\033[0m %s\n" "$*"; }
warn() { printf "\033[1;33m  !\033[0m %s\n" "$*"; }
die() { printf "\n\033[1;31m!!\033[0m %s\n" "$*" >&2; exit 1; }

[[ ${EUID} -eq 0 ]] || die "Run as root: sudo -E ./deploy/ec2/setup.sh"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${REPO_ROOT}"

# ---------------------------------------------------------------------------
# 0. Detect distribution and set the Apache specifics once.
# ---------------------------------------------------------------------------
if command -v apt-get >/dev/null 2>&1; then
    DISTRO="ubuntu"
    APACHE_SERVICE="apache2"
    APACHE_CONF="/etc/apache2/sites-available/daybook.conf"
    APACHE_LOG_DIR="/var/log/apache2"
    WEB_GROUP="www-data"
elif command -v dnf >/dev/null 2>&1 || command -v yum >/dev/null 2>&1; then
    DISTRO="amazon"
    APACHE_SERVICE="httpd"
    APACHE_CONF="/etc/httpd/conf.d/daybook.conf"
    APACHE_LOG_DIR="/var/log/httpd"
    WEB_GROUP="root"
else
    die "Unsupported distribution: expected apt-get (Ubuntu) or dnf/yum (Amazon Linux)."
fi
log "Detected ${DISTRO}; Apache service: ${APACHE_SERVICE}"

# ---------------------------------------------------------------------------
# 1. Swap — Maven and Vite builds will OOM on a 1 GB instance without it.
# ---------------------------------------------------------------------------
MEM_MB=$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)
if [[ ${MEM_MB} -lt 2000 && ! -f /swapfile ]]; then
    log "Instance has ${MEM_MB} MB RAM — adding 2 GB swap"
    fallocate -l 2G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=2048 status=none
    chmod 600 /swapfile
    mkswap /swapfile >/dev/null
    swapon /swapfile
    grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# ---------------------------------------------------------------------------
# 2. Packages
# ---------------------------------------------------------------------------
log "Installing git, Apache and Java 21"
if [[ ${DISTRO} == "ubuntu" ]]; then
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -qq
    apt-get install -y -qq git curl ca-certificates tar apache2 openjdk-21-jdk-headless
else
    PM=dnf
    command -v dnf >/dev/null 2>&1 || PM=yum
    ${PM} install -y -q git tar curl httpd java-21-amazon-corretto-headless
fi

command -v java >/dev/null 2>&1 \
    || die "Java 21 was not installed. On Ubuntu 22.04 run: sudo apt-get install -y openjdk-21-jdk-headless"
java -version 2>&1 | head -1

if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | sed 's/^v\([0-9]*\).*/\1/')" -lt 20 ]]; then
    log "Installing Node.js 20 (NodeSource)"
    if [[ ${DISTRO} == "ubuntu" ]]; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        apt-get install -y -qq nodejs
    else
        curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
        ${PM} install -y -q nodejs
    fi
fi
node -v

# ---------------------------------------------------------------------------
# 3. Build
# ---------------------------------------------------------------------------
log "Building the API (Maven wrapper, tests skipped)"
(cd backend && ./mvnw -B -q -DskipTests package)

log "Building the SPA"
(cd frontend && npm ci --no-audit --no-fund && npm run build)

[[ -f "backend/target/${JAR_NAME}" ]] || die "API jar not produced at backend/target/${JAR_NAME}"
[[ -f frontend/dist/index.html ]] || die "SPA build missing at frontend/dist"

# ---------------------------------------------------------------------------
# 4. Users and directories
# ---------------------------------------------------------------------------
NOLOGIN="$(command -v nologin || echo /bin/false)"
id -u "${APP_USER}" >/dev/null 2>&1 \
    || useradd --system --home-dir "${APP_DIR}" --shell "${NOLOGIN}" "${APP_USER}"

install -d -o "${APP_USER}" -g "${APP_USER}" "${APP_DIR}"
install -d -o root -g "${APP_USER}" -m 750 "${ENV_DIR}"
install -d -o root -g "${WEB_GROUP}" -m 755 "${WEB_DIR}"

log "Installing artefacts"
install -m 644 -o "${APP_USER}" -g "${APP_USER}" "backend/target/${JAR_NAME}" "${APP_DIR}/${JAR_NAME}"
rm -rf "${WEB_DIR:?}"/*
cp -r frontend/dist/. "${WEB_DIR}/"
chown -R root:"${WEB_GROUP}" "${WEB_DIR}"
find "${WEB_DIR}" -type d -exec chmod 755 {} +
find "${WEB_DIR}" -type f -exec chmod 644 {} +

# ---------------------------------------------------------------------------
# 5. Environment file
# ---------------------------------------------------------------------------
if [[ ! -f "${ENV_FILE}" ]]; then
    if [[ -n "${DB_HOST:-}" && -n "${DB_PASSWORD:-}" ]]; then
        log "Writing ${ENV_FILE} from supplied variables"
        cat > "${ENV_FILE}" <<EOF
SPRING_PROFILES_ACTIVE=prod
DB_HOST=${DB_HOST}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-daybook}
DB_USERNAME=${DB_USERNAME:-daybook}
DB_PASSWORD=${DB_PASSWORD}
DB_SSLMODE=${DB_SSLMODE:-require}
DB_POOL_SIZE=${DB_POOL_SIZE:-10}
CORS_ALLOWED_ORIGINS=${CORS_ALLOWED_ORIGINS:-http://localhost}
JAVA_OPTS=${JAVA_OPTS:--Xms256m -Xmx1024m -XX:+UseG1GC -XX:+ExitOnOutOfMemoryError}
EOF
    else
        log "Creating ${ENV_FILE} from the template"
        install -m 600 -o root -g "${APP_USER}" deploy/ec2/daybook.env.example "${ENV_FILE}"
        warn "DB credentials are placeholders — edit ${ENV_FILE} before the API can start."
    fi
    chown root:"${APP_USER}" "${ENV_FILE}"
    chmod 600 "${ENV_FILE}"
else
    log "Keeping existing ${ENV_FILE}"
fi

API_READY=1
grep -q "CHANGE_ME\|change-me" "${ENV_FILE}" && API_READY=0

# ---------------------------------------------------------------------------
# 6. systemd
# ---------------------------------------------------------------------------
log "Installing systemd unit"
install -m 644 deploy/ec2/daybook.service /etc/systemd/system/daybook.service
systemctl daemon-reload
systemctl enable daybook >/dev/null 2>&1 || true

if [[ ${API_READY} -eq 1 ]]; then
    systemctl restart daybook
else
    warn "Skipping API start until ${ENV_FILE} has real credentials."
fi

# ---------------------------------------------------------------------------
# 7. Apache
# ---------------------------------------------------------------------------
DOMAIN="${DOMAIN:-_}"
log "Configuring Apache (ServerName ${DOMAIN})"

# Replace only the live ServerName line, and point logs at this distro's directory.
sed -e "0,/^[[:space:]]*ServerName daybook\.example\.com\$/s//    ServerName ${DOMAIN}/" \
    -e "s|\${APACHE_LOG_DIR}|${APACHE_LOG_DIR}|g" \
    deploy/ec2/daybook.conf > "${APACHE_CONF}"

if [[ ${DISTRO} == "ubuntu" ]]; then
    a2enmod -q proxy proxy_http headers deflate >/dev/null
    a2dissite 000-default >/dev/null 2>&1 || true
    a2ensite daybook >/dev/null
    apache2ctl configtest || die "Apache configuration test failed — see the message above."

    # A manually started Apache (or another server) holding :80 makes the restart
    # fail with a bare "Address already in use". Name the culprit instead.
    PORT80_PID="$(ss -tlnpH 'sport = :80' 2>/dev/null | sed -n 's/.*pid=\([0-9]*\).*/\1/p' | head -1)"
    APACHE_PID="$(systemctl show -p MainPID --value apache2 2>/dev/null || echo 0)"
    if [[ -n "${PORT80_PID}" && "${PORT80_PID}" != "0" && "${PORT80_PID}" != "${APACHE_PID}" ]]; then
        warn "Port 80 is held by PID ${PORT80_PID} ($(ps -o comm= -p "${PORT80_PID}" 2>/dev/null || echo unknown))"
        die "Stop that process (e.g. sudo pkill -f apache2) and re-run this script."
    fi

    systemctl enable apache2 >/dev/null 2>&1 || true
    systemctl restart apache2 || {
        ss -tlnpH 'sport = :80'
        die "Apache failed to start. Check: journalctl -xeu apache2.service"
    }
else
    httpd -t || die "Apache configuration test failed — see the message above."
    systemctl enable httpd >/dev/null 2>&1 || true
    systemctl restart httpd
fi

# Ubuntu ships ufw; Amazon Linux ships firewalld. Open only if active.
if command -v ufw >/dev/null 2>&1 && ufw status | grep -q "Status: active"; then
    log "Allowing 80/443 through ufw"
    ufw allow 'Apache Full' >/dev/null 2>&1 || { ufw allow 80/tcp; ufw allow 443/tcp; }
fi

if systemctl is-active --quiet firewalld; then
    log "Opening 80/443 in firewalld"
    firewall-cmd --permanent --add-service=http --add-service=https >/dev/null
    firewall-cmd --reload >/dev/null
fi

# Amazon Linux may enforce SELinux; Ubuntu uses AppArmor and needs nothing here.
if command -v getenforce >/dev/null 2>&1 && [[ "$(getenforce)" == "Enforcing" ]]; then
    log "SELinux is enforcing — allowing Apache to reach the JVM on loopback"
    setsebool -P httpd_can_network_connect 1
    restorecon -R "${WEB_DIR}" >/dev/null 2>&1 || true
fi

# ---------------------------------------------------------------------------
# 8. Verify
# ---------------------------------------------------------------------------
echo
if [[ ${API_READY} -eq 1 ]]; then
    log "Waiting for the API"
    HEALTHY=0
    for _ in $(seq 1 30); do
        if curl -fsS http://127.0.0.1:8080/actuator/health/readiness >/dev/null 2>&1; then
            HEALTHY=1
            break
        fi
        sleep 2
    done

    if [[ ${HEALTHY} -eq 1 ]]; then
        echo "    API is up"
        curl -fsS http://127.0.0.1/healthz; echo
        PUBLIC_IP="$(curl -s --max-time 2 http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || true)"
        echo
        echo "Daybook is live on http://${PUBLIC_IP:-<instance-public-ip>}/"
    else
        warn "API did not become healthy. Check: journalctl -u daybook -n 80 --no-pager"
    fi
else
    cat <<EOF
Next: edit ${ENV_FILE} with the RDS endpoint and credentials, then run

    sudo systemctl start daybook && sudo systemctl status daybook --no-pager

EOF
fi
