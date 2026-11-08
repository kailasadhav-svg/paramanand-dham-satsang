#!/usr/bin/env bash
# VPS वर (root): आरती/पदसंग्रह app चा URL /parmamad → /parmanand. पुन्हा चालवण्यास सुरक्षित.
#   - tdp-nginx (docker) मधील location /parmamad/ → /parmanand/, जुन्या /parmamad/… लिंक्सवर 301
#   - single-file bind mount असल्यास conf container मध्ये in-place लिहिते (restart/outage नाही)
#   - parmamad.service मधील PARMAMAD_PREFIX=/parmanand (service/app फोल्डरची नावे तशीच)
#   - app च्या js/html/css मधील hardcoded /parmamad/ → /parmanand/ (admin pages चे POST टिकावेत)
# Backups: <nginx conf>.bak.<time>, /root/parmamad.service.bak.<time>, /root/parmamad-app-backup-<time>/
set -euo pipefail

OLD="${OLD:-parmamad}"
NEW="${NEW:-parmanand}"
CTR="${CTR:-tdp-nginx}"
UNIT="${UNIT:-/etc/systemd/system/parmamad.service}"
APP_DIR="${APP_DIR:-/opt/parmamad-app}"
HOST="${HOST:-satsang.dhyeyapurti.in}"
STAMP="$(date +%F_%H%M%S)"

[ "$(id -u)" = 0 ] || { echo "root म्हणून चालवा" >&2; exit 1; }
command -v docker >/dev/null || { echo "docker नाही" >&2; exit 1; }
docker inspect "$CTR" >/dev/null 2>&1 || { echo "container $CTR सापडला नाही" >&2; exit 1; }

container_has_new() {
  docker exec "$CTR" nginx -T 2>/dev/null | grep -q "location \^~ /$NEW/"
}

# --- 1. nginx conf: host वर bind-mount शोधा (Source<TAB>Destination), नाहीतर container मधून copy करा
CONF=""; DEST=""; IN_CONTAINER=""
while IFS=$'\t' read -r src dst; do
  [ -n "$src" ] || continue
  if [ -f "$src" ]; then
    if grep -q "location \^~ /\($OLD\|$NEW\)/" "$src"; then CONF="$src"; DEST="$dst"; break; fi
  elif [ -d "$src" ]; then
    f="$(grep -rl "location \^~ /\($OLD\|$NEW\)/" "$src" 2>/dev/null | head -1 || true)"
    if [ -n "$f" ]; then CONF="$f"; DEST="$dst/${f#"$src"/}"; break; fi
  fi
done < <(docker inspect "$CTR" --format '{{range .Mounts}}{{.Source}}{{"\t"}}{{.Destination}}{{"\n"}}{{end}}')

if [ -z "$CONF" ]; then
  IN_CONTAINER="$(docker exec "$CTR" sh -c "grep -rl 'location \\^~ /$OLD/' /etc/nginx 2>/dev/null" | head -1 || true)"
  [ -n "$IN_CONTAINER" ] || { echo "nginx conf मध्ये location ^~ /$OLD/ सापडले नाही" >&2; exit 1; }
  CONF="/root/$CTR-$(basename "$IN_CONTAINER")"; DEST="$IN_CONTAINER"
  docker cp "$CTR:$IN_CONTAINER" "$CONF"
  echo "टीप: conf फक्त container मध्ये आहे ($IN_CONTAINER); container पुन्हा बनवल्यास हा बदल परत करावा लागेल."
fi
echo "nginx conf: $CONF  (container: $DEST)"
BAK="$CONF.bak.$STAMP"
cp -a "$CONF" "$BAK"

if grep -q "location \^~ /$NEW/" "$CONF"; then
  echo "host conf मध्ये /$NEW/ आधीच आहे — conf बदलले नाही"
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

# नवे conf आधी वेगळ्या throwaway container मध्ये तपासा (same image + same mounts, सर्व read-only)
IMAGE="$(docker inspect "$CTR" --format '{{.Config.Image}}')"
mapfile -t TEST_MOUNTS < <(docker inspect "$CTR" --format '{{range .Mounts}}{{.Source}}:{{.Destination}}:ro{{"\n"}}{{end}}' | sed '/^$/d')
VOL_ARGS=()
for m in "${TEST_MOUNTS[@]}"; do VOL_ARGS+=(-v "$m"); done
[ -n "$IN_CONTAINER" ] && VOL_ARGS+=(-v "$CONF:$DEST:ro")
if ! docker run --rm "${VOL_ARGS[@]}" "$IMAGE" nginx -t; then
  echo "नवे nginx conf अवैध — backup परत ठेवतो, काहीही बदलले नाही" >&2
  cp -a "$BAK" "$CONF"
  exit 1
fi

# single-file bind mount: sed -i ने नवा inode बनवला तर container ला जुनीच फाइल दिसते.
# mount बहुधा read-only असतो, म्हणून in-place जमले नाही तर container restart (काही सेकंद).
if ! container_has_new; then
  if docker exec -i "$CTR" sh -c "cat > '$DEST'" < "$CONF" 2>/dev/null; then
    echo "conf container मध्ये in-place लिहिले"
    docker exec "$CTR" nginx -s reload
  else
    echo "mount read-only — $CTR restart करतो (काही सेकंद outage)"
    docker restart "$CTR" >/dev/null
    for _ in $(seq 1 30); do
      docker exec "$CTR" nginx -t >/dev/null 2>&1 && break
      sleep 1
    done
  fi
else
  docker exec "$CTR" nginx -s reload
fi
sleep 1
container_has_new && echo "nginx: /$NEW/ route सक्रिय" || { echo "nginx अजूनही /$NEW/ दाखवत नाही" >&2; exit 1; }

# --- 2. python app चा URL prefix
cp -a "$UNIT" "/root/$(basename "$UNIT").bak.$STAMP"
sed -i "s#^Environment=PARMAMAD_PREFIX=/$OLD\$#Environment=PARMAMAD_PREFIX=/$NEW#" "$UNIT"
grep -n "PARMAMAD_PREFIX" "$UNIT"

# --- 3. app फाइल्समधील hardcoded /parmamad/ (backup /root मध्ये, फोल्डरमध्ये नाही)
mapfile -t FILES < <(grep -rl "/$OLD/" "$APP_DIR" --include='*.js' --include='*.html' --include='*.css' 2>/dev/null || true)
if [ "${#FILES[@]}" -gt 0 ]; then
  BK="/root/$(basename "$APP_DIR")-backup-$STAMP"
  mkdir -p "$BK"
  for f in "${FILES[@]}"; do
    mkdir -p "$BK/$(dirname "${f#"$APP_DIR"/}")"
    cp -a "$f" "$BK/${f#"$APP_DIR"/}"
    sed -i "s#/$OLD/#/$NEW/#g" "$f"
  done
  echo "app फाइल्स बदलल्या (${#FILES[@]}), backup: $BK"
  printf '  %s\n' "${FILES[@]}"
else
  echo "app फाइल्समध्ये /$OLD/ नाही"
fi

systemctl daemon-reload
systemctl restart "$(basename "$UNIT")"
sleep 2
echo "service: $(systemctl is-active "$(basename "$UNIT")")"

# --- 4. तपासा
for p in "/$NEW/index.html" "/$NEW/" "/$NEW/player.js" "/$OLD/index.html" "/$OLD/"; do
  printf '%-26s ' "$p"
  curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' "https://$HOST$p"
done
echo "झाले: https://$HOST/$NEW/"
