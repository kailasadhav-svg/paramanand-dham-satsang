#!/usr/bin/env bash
# VPS वर एकदाच (root म्हणून) चालवा: systemd timer बसवतो जो दर ५ मिनिटांनी
# scripts/auto-deploy.sh चालवतो — GitHub main बदलले की live साइट आपोआप update.
#
#   bash scripts/install-auto-deploy.sh            # main, दर 5min
#   INTERVAL=2min bash scripts/install-auto-deploy.sh
#
# नंतर: systemctl status satsang-deploy.timer · journalctl -u satsang-deploy -n 50
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BRANCH="${1:-main}"
INTERVAL="${INTERVAL:-5min}"

if [ "$(id -u)" != 0 ]; then
  echo "root म्हणून चालवा: sudo bash $0" >&2
  exit 1
fi
command -v systemctl >/dev/null 2>&1 || { echo "systemd नाही — हा installer फक्त systemd साठी आहे." >&2; exit 1; }
command -v node >/dev/null 2>&1 || { echo "node सापडला नाही — आधी Node.js install करा." >&2; exit 1; }

# systemd units carry a minimal PATH; keep the node that this shell found (nvm, /usr/local, …).
NODE_BIN="$(dirname "$(command -v node)")"
SERVICE_PATH="$NODE_BIN:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

cat >/etc/systemd/system/satsang-deploy.service <<EOF
[Unit]
Description=Paramanand Dham Satsang auto-deploy (git pull + build + restart)
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
WorkingDirectory=$APP_DIR
Environment=HOME=/root
Environment=PATH=$SERVICE_PATH
ExecStart=/usr/bin/env bash $APP_DIR/scripts/auto-deploy.sh $BRANCH
EOF

cat >/etc/systemd/system/satsang-deploy.timer <<EOF
[Unit]
Description=Check GitHub for new satsang commits every $INTERVAL

[Timer]
OnBootSec=2min
OnUnitActiveSec=$INTERVAL
Unit=satsang-deploy.service

[Install]
WantedBy=timers.target
EOF

systemctl daemon-reload
systemctl enable --now satsang-deploy.timer
systemctl list-timers satsang-deploy.timer --no-pager

echo
echo "झाले. आता GitHub main बदलले की $INTERVAL मध्ये साइट आपोआप update होईल."
echo "लॉग: journalctl -u satsang-deploy -n 50   ·   लगेच चालवा: systemctl start satsang-deploy.service"
