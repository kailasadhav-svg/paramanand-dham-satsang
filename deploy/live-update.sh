#!/usr/bin/env bash
set -euo pipefail
APP_DIR="${APP_DIR:-/var/www/satsang}"
BRANCH="cursor/satsang-dhyeyapurti-vps-179d"
REPO="https://github.com/kailasadhav-svg/paramanand-dham-satsang.git"
if [[ "$(id -u)" -ne 0 ]]; then echo "sudo bash $0"; exit 1; fi
if [[ -d "$APP_DIR/.git" ]]; then
  git -C "$APP_DIR" fetch origin
  git -C "$APP_DIR" checkout "$BRANCH"
  git -C "$APP_DIR" pull --ff-only origin "$BRANCH"
else
  mkdir -p "$APP_DIR"
  git clone --branch "$BRANCH" "$REPO" "$APP_DIR"
fi
cd "$APP_DIR"
# Keep existing .env.local; force live WhatsApp unless already set
if [[ -f .env.local ]]; then
  grep -q '^APP_PUBLIC_URL=' .env.local || echo 'APP_PUBLIC_URL=https://satsang.dhyeyapurti.in/ajapa' >> .env.local
  # Turn off dry-run for live (user can re-enable)
  sed -i 's/^WHATSAPP_DRY_RUN=.*/WHATSAPP_DRY_RUN=0/' .env.local || true
  grep -q '^WHATSAPP_DRY_RUN=' .env.local || echo 'WHATSAPP_DRY_RUN=0' >> .env.local
fi
npm ci
npm run build
systemctl restart satsang || (cp deploy/satsang.service /etc/systemd/system/satsang.service && systemctl daemon-reload && systemctl enable --now satsang)
systemctl reload nginx || true
curl -sS https://satsang.dhyeyapurti.in/api/health || true
echo
echo DONE

# Reminder: set LEGACY_WHATSAPP_WEBHOOK_URL in .env.local to the OLD
# Team Dhyeyapurti voter-bot webhook so hi / 1–9 keep working.
