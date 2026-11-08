#!/usr/bin/env bash
# VPS वर एकदाच (root): आरती/पदसंग्रह app चा URL /parmamad → /parmanand.
#   - tdp-nginx (docker) मधील location /parmamad/ → /parmanand/, जुन्या /parmamad/… लिंक्सवर 301
#   - parmamad.service मधील PARMAMAD_PREFIX=/parmanand (service/app फोल्डरची नावे तशीच राहतात)
# Backups: <nginx conf>.bak.<time>, /root/parmamad.service.bak.<time>
set -euo pipefail

OLD="${OLD:-parmamad}"
NEW="${NEW:-parmanand}"
CTR="${CTR:-tdp-nginx}"
UNIT="${UNIT:-/etc/systemd/system/parmamad.service}"
HOST="${HOST:-satsang.dhyeyapurti.in}"
STAMP="$(date +%F_%H%M%S)"

[ "$(id -u)" = 0 ] || { echo "root म्हणून चालवा" >&2; exit 1; }
command -v docker >/dev/null || { echo "docker नाही" >&2; exit 1; }
docker inspect "$CTR" >/dev/null 2>&1 || { echo "container $CTR सापडला नाही" >&2; exit 1; }

# --- 1. nginx conf: host वर bind-mount शोधा, नाहीतर container मधून copy करा
CONF=""
IN_CONTAINER=""
while IFS= read -r src; do
  [ -n "$src" ] || continue
  f="$(grep -rl "location \^~ /$OLD/" "$src" 2>/dev/null | head -1 || true)"
  if [ -n "$f" ]; then CONF="$f"; break; fi
done < <(docker inspect "$CTR" --format '{{range .Mounts}}{{.Source}}{{"\n"}}{{end}}')

if [ -z "$CONF" ]; then
  IN_CONTAINER="$(docker exec "$CTR" sh -c "grep -rl 'location \\^~ /$OLD/' /etc/nginx 2>/dev/null" | head -1 || true)"
  [ -n "$IN_CONTAINER" ] || { echo "nginx conf मध्ये location ^~ /$OLD/ सापडले नाही" >&2; exit 1; }
  CONF="/root/$CTR-$(basename "$IN_CONTAINER")"
  docker cp "$CTR:$IN_CONTAINER" "$CONF"
  echo "टीप: conf फक्त container मध्ये आहे ($IN_CONTAINER); container पुन्हा बनवल्यास हा बदल परत करावा लागेल."
fi
echo "nginx conf: $CONF"
BAK="$CONF.bak.$STAMP"
cp -a "$CONF" "$BAK"

if grep -q "location \^~ /$NEW/" "$CONF"; then
  echo "nginx मध्ये /$NEW/ आधीच आहे — conf बदलले नाही"
else
  sed -i \
    -e "s#location = /$OLD { return 301 /$OLD/; }#location = /$NEW { return 301 /$NEW/; }#" \
    -e "s#location \^~ /$OLD/ {#location ^~ /$NEW/ {#" \
    "$CONF"
  # जुन्या लिंक्स चालू राहाव्यात: /parmamad → /parmanand (301)
  sed -i \
    -e "s#^\(\s*\)location = /$NEW { return 301 /$NEW/; }#&\n\1location = /$OLD { return 301 /$NEW/; }\n\1location ^~ /$OLD/ { rewrite ^/$OLD/(.*)\$ /$NEW/\$1 permanent; }#" \
    "$CONF"
fi

if [ -n "$IN_CONTAINER" ]; then
  docker cp "$CONF" "$CTR:$IN_CONTAINER"
fi
if ! docker exec "$CTR" nginx -t; then
  echo "nginx -t अयशस्वी — backup परत ठेवतो" >&2
  cp -a "$BAK" "$CONF"
  [ -n "$IN_CONTAINER" ] && docker cp "$CONF" "$CTR:$IN_CONTAINER"
  exit 1
fi

# --- 2. python app चा URL prefix
cp -a "$UNIT" "/root/$(basename "$UNIT").bak.$STAMP"
sed -i "s#^Environment=PARMAMAD_PREFIX=/$OLD\$#Environment=PARMAMAD_PREFIX=/$NEW#" "$UNIT"
grep -n "PARMAMAD_PREFIX" "$UNIT"
systemctl daemon-reload
systemctl restart "$(basename "$UNIT")"

# --- 3. लागू करा व तपासा
docker exec "$CTR" nginx -s reload
sleep 2
echo "service: $(systemctl is-active "$(basename "$UNIT")")"
for p in "/$NEW/index.html" "/$NEW/" "/$OLD/index.html" "/$OLD/"; do
  printf '%-26s ' "$p"
  curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' "https://$HOST$p"
done
echo "app फाइल्समध्ये hardcoded /$OLD/:"
grep -rln "/$OLD/" /opt/parmamad-app --include='*.js' --include='*.html' --include='*.css' 2>/dev/null || echo "none"
echo "झाले: https://$HOST/$NEW/"
