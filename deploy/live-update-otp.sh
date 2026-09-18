#!/usr/bin/env bash
# Deploy OTP WhatsApp fix to satsang.dhyeyapurti.in (Hostinger VPS).
# Run on the VPS as root:
#   sudo bash -c 'curl -fsSL https://raw.githubusercontent.com/kailasadhav-svg/paramanand-dham-satsang/cursor/fix-whatsapp-otp-delivery-37f4/deploy/live-update-otp.sh -o /tmp/live-update-otp.sh && bash /tmp/live-update-otp.sh'
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/satsang}"
BRANCH="${BRANCH:-cursor/fix-whatsapp-otp-delivery-37f4}"
REPO="https://github.com/kailasadhav-svg/paramanand-dham-satsang.git"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "sudo bash $0"
  exit 1
fi

if [[ -d "$APP_DIR/.git" ]]; then
  git -C "$APP_DIR" fetch origin
  git -C "$APP_DIR" checkout "$BRANCH"
  git -C "$APP_DIR" pull --ff-only origin "$BRANCH"
else
  mkdir -p "$APP_DIR"
  git clone --branch "$BRANCH" "$REPO" "$APP_DIR"
fi

cd "$APP_DIR"

if [[ -f .env.local ]]; then
  grep -q '^APP_PUBLIC_URL=' .env.local || echo 'APP_PUBLIC_URL=https://satsang.dhyeyapurti.in' >> .env.local
  sed -i 's/^WHATSAPP_DRY_RUN=.*/WHATSAPP_DRY_RUN=0/' .env.local || true
  grep -q '^WHATSAPP_DRY_RUN=' .env.local || echo 'WHATSAPP_DRY_RUN=0' >> .env.local
  grep -q '^WHATSAPP_OTP_AUTH=' .env.local || echo 'WHATSAPP_OTP_AUTH=1' >> .env.local
  # Locked to approved Team Dhyeyapurti AUTHENTICATION OTP
  if grep -q '^WHATSAPP_OTP_TEMPLATE=' .env.local; then
    sed -i 's/^WHATSAPP_OTP_TEMPLATE=.*/WHATSAPP_OTP_TEMPLATE=home_login_otp/' .env.local
  else
    echo 'WHATSAPP_OTP_TEMPLATE=home_login_otp' >> .env.local
  fi
  if grep -q '^WHATSAPP_OTP_LANG=' .env.local; then
    sed -i 's/^WHATSAPP_OTP_LANG=.*/WHATSAPP_OTP_LANG=en_US/' .env.local
  else
    echo 'WHATSAPP_OTP_LANG=en_US' >> .env.local
  fi
fi

echo "=== env check (redacted) ==="
grep -E '^(WHATSAPP_|TURIYA_|ALLOW_FILE)' .env.local 2>/dev/null | sed -E 's/(TOKEN|SECRET|KEY|PASSWORD)=.*/\1=***/' || true

if ! grep -qE '^WHATSAPP_TOKEN=.+' .env.local 2>/dev/null && ! grep -qE '^TURIYA_API_KEY=.+' .env.local 2>/dev/null; then
  echo "WARNING: No WHATSAPP_TOKEN or TURIYA_API_KEY in .env.local — OTP cannot send."
  echo "Add Meta Graph WHATSAPP_TOKEN + WHATSAPP_PHONE_NUMBER_ID (or Turiya key), then re-run."
fi

npm ci
npm run build
systemctl restart satsang || true
systemctl reload nginx || true

echo "=== health ==="
curl -sS https://satsang.dhyeyapurti.in/api/health || true
echo
echo "DONE — open app, login PIN, enter 9225118811 or 9850120960, check WhatsApp OTP."
echo "If still failing: set WHATSAPP_OTP_TEMPLATE=<exact Meta AUTHENTICATION template name> in .env.local and restart."
