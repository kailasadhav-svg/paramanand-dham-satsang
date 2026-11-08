#!/usr/bin/env bash
# GitHub वर नवे commits आले का ते पाहा; आले असतील तरच scripts/deploy.sh चालवा.
# systemd timer (scripts/install-auto-deploy.sh) हे दर ५ मिनिटांनी चालवतो.
#
#   bash scripts/auto-deploy.sh            # main
#   DRY_RUN=1 bash scripts/auto-deploy.sh  # फक्त तपासा, deploy करू नका
set -euo pipefail

cd "$(dirname "$0")/.."
BRANCH="${1:-main}"
LOCK_FILE="${LOCK_FILE:-/var/lock/satsang-deploy.lock}"

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "deploy आधीच चालू आहे — वगळले."
  exit 0
fi

git fetch -q origin "$BRANCH"
LOCAL="$(git rev-parse HEAD)"
REMOTE="$(git rev-parse "origin/$BRANCH")"
if [ "$LOCAL" = "$REMOTE" ]; then
  exit 0
fi

echo "== $(date -Is) नवे commits: ${LOCAL:0:7} → ${REMOTE:0:7}"
if [ "${DRY_RUN:-0}" = "1" ]; then
  echo "(dry-run) bash scripts/deploy.sh $BRANCH"
  exit 0
fi
bash scripts/deploy.sh "$BRANCH"
