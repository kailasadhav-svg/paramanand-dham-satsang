#!/usr/bin/env bash
# प्रवेश पिन (ADMIN_PIN) पाहा किंवा बदला — VPS वर app फोल्डरमधून चालवा.
#
#   bash scripts/admin-pin.sh          # सध्याचा PIN दाखवा
#   bash scripts/admin-pin.sh 2468     # नवा PIN ठेवा आणि app restart करा
#
# Restart: pm2 असेल तर आपोआप; systemd साठी SATSANG_SERVICE=<unit> द्या.
set -euo pipefail

cd "$(dirname "$0")/.."

ENV_FILE=""
for f in .env.local .env; do
  if [ -f "$f" ]; then
    ENV_FILE="$f"
    break
  fi
done

current_pin() {
  [ -n "$ENV_FILE" ] || return 0
  grep -E '^ADMIN_PIN=' "$ENV_FILE" | tail -1 | cut -d= -f2- | tr -d '"'"'"' '
}

if [ $# -eq 0 ]; then
  pin="$(current_pin)"
  if [ -n "$pin" ]; then
    echo "प्रवेश पिन (ADMIN_PIN) [$ENV_FILE]: $pin"
  elif [ -n "${ADMIN_PIN:-}" ]; then
    echo "प्रवेश पिन (environment): $ADMIN_PIN"
  else
    echo "ADMIN_PIN सेट नाही — डीफॉल्ट 1960 (production मध्ये नाकारले जाते)."
    echo "नवा ठेवा: bash scripts/admin-pin.sh <४–८ अंकी PIN>"
  fi
  exit 0
fi

new="$1"
if ! [[ "$new" =~ ^[0-9]{4,8}$ ]]; then
  echo "PIN ४ ते ८ अंकीच हवा (फक्त आकडे)." >&2
  exit 1
fi
if [ "$new" = "1960" ]; then
  echo "1960 डीफॉल्ट आहे — production मध्ये चालत नाही; वेगळा PIN निवडा." >&2
  exit 1
fi

if [ -z "$ENV_FILE" ]; then
  ENV_FILE=.env.local
  touch "$ENV_FILE"
fi
cp "$ENV_FILE" "$ENV_FILE.bak.$(date +%Y%m%d%H%M%S)"
if grep -qE '^ADMIN_PIN=' "$ENV_FILE"; then
  sed -i.tmp "s/^ADMIN_PIN=.*/ADMIN_PIN=$new/" "$ENV_FILE"
  rm -f "$ENV_FILE.tmp"
else
  printf '\nADMIN_PIN=%s\n' "$new" >>"$ENV_FILE"
fi
echo "ADMIN_PIN बदलला → $ENV_FILE (जुनी प्रत: $ENV_FILE.bak.*)"

if command -v pm2 >/dev/null 2>&1 && pm2 list 2>/dev/null | grep -q online; then
  pm2 restart all --update-env >/dev/null
  echo "pm2 restart झाले — नवा PIN लगेच लागू."
elif [ -n "${SATSANG_SERVICE:-}" ] && command -v systemctl >/dev/null 2>&1; then
  sudo systemctl restart "$SATSANG_SERVICE"
  echo "systemd ($SATSANG_SERVICE) restart झाले — नवा PIN लागू."
else
  echo "आता app restart करा (उदा. pm2 restart all  किंवा  sudo systemctl restart <service>) — मग नवा PIN लागू."
fi
