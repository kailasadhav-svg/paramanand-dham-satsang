#!/usr/bin/env bash
# Deploy परमानंद धाम सत्संग on Hostinger VPS at https://satsang.dhyeyapurti.in
# Run ON THE SERVER as root (or sudo):
#   curl -fsSL https://raw.githubusercontent.com/kailasadhav-svg/paramanand-dham-satsang/main/deploy/setup-vps.sh | bash
# Or from a clone:
#   sudo bash deploy/setup-vps.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/satsang}"
REPO_URL="${REPO_URL:-https://github.com/kailasadhav-svg/paramanand-dham-satsang.git}"
DOMAIN="${DOMAIN:-satsang.dhyeyapurti.in}"
NODE_MAJOR="${NODE_MAJOR:-22}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root: sudo bash deploy/setup-vps.sh"
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y nginx git curl ca-certificates

# Node.js via NodeSource
if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | sed 's/v//;s/\..*//')" -lt "$NODE_MAJOR" ]]; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y nodejs
fi

mkdir -p "$APP_DIR"
if [[ -d "$APP_DIR/.git" ]]; then
  git -C "$APP_DIR" fetch origin
  git -C "$APP_DIR" checkout main
  git -C "$APP_DIR" pull --ff-only origin main
else
  git clone "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"
npm ci
npm run build

# Env file (create once; do not overwrite secrets)
if [[ ! -f "$APP_DIR/.env.local" ]]; then
  SESSION_SECRET="$(openssl rand -hex 32)"
  cat >"$APP_DIR/.env.local" <<EOF
ADMIN_PIN=1960
SESSION_SECRET=${SESSION_SECRET}
COOKIE_SECURE=true
APP_PUBLIC_URL=https://${DOMAIN}/ajapa
# VPS uses local SQLite under data/satsang.db — do not set TURSO_* here
WHATSAPP_DRY_RUN=1
GURU_PHONE=9850120960
NEXT_PUBLIC_GURU_PHONE=9850120960
NEXT_PUBLIC_SOFTWARE_PHONE=9225118811
NEXT_PUBLIC_SEEKER_PHONES=9423078811,9136443333
EOF
  echo "Created $APP_DIR/.env.local — edit WhatsApp keys as needed."
fi

mkdir -p "$APP_DIR/data"
chown -R www-data:www-data "$APP_DIR"

# systemd
cp "$APP_DIR/deploy/satsang.service" /etc/systemd/system/satsang.service
# Prefer node from PATH if npm is under /usr/local
NPM_BIN="$(command -v npm)"
sed -i "s|^ExecStart=.*|ExecStart=${NPM_BIN} run start|" /etc/systemd/system/satsang.service
systemctl daemon-reload
systemctl enable satsang
systemctl restart satsang

# nginx (do not replace unrelated sites)
cp "$APP_DIR/deploy/nginx-satsang.dhyeyapurti.in.conf" /etc/nginx/sites-available/${DOMAIN}
ln -sfn /etc/nginx/sites-available/${DOMAIN} /etc/nginx/sites-enabled/${DOMAIN}
nginx -t
systemctl reload nginx

# TLS
if ! command -v certbot >/dev/null 2>&1; then
  apt-get install -y certbot python3-certbot-nginx
fi
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email --redirect || {
  echo "Certbot failed — check DNS A record for ${DOMAIN} and retry:"
  echo "  sudo certbot --nginx -d ${DOMAIN}"
}

echo
echo "Done. Check:"
echo "  curl -sS https://${DOMAIN}/api/health"
echo "  systemctl status satsang --no-pager"
