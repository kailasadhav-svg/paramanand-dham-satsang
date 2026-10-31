#!/usr/bin/env bash
# Live सर्व्हर (VPS) update: GitHub वरून नवा code ओढा, build करा, app restart करा.
#
#   bash scripts/deploy.sh            # main branch
#   bash scripts/deploy.sh <branch>   # दुसरी branch तपासण्यासाठी
#
# Restart: pm2 असेल तर आपोआप; systemd साठी SATSANG_SERVICE=<unit> द्या.
set -euo pipefail

cd "$(dirname "$0")/.."
BRANCH="${1:-main}"

echo "== git fetch origin $BRANCH"
git fetch origin "$BRANCH"
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "सर्व्हरवर न-commit केलेले बदल आहेत — बाजूला ठेवतो (git stash list मध्ये दिसतील)."
  git stash push -u -m "deploy.sh $(date +%F_%T)" >/dev/null
fi
git checkout -q "$BRANCH" 2>/dev/null || git checkout -q -b "$BRANCH" "origin/$BRANCH"
git pull --ff-only origin "$BRANCH"

echo "== npm ci (dev deps सह — build ला लागतात)"
npm ci --include=dev

echo "== next build"
npm run build

echo "== restart"
if command -v pm2 >/dev/null 2>&1 && pm2 list 2>/dev/null | grep -q online; then
  pm2 restart all --update-env >/dev/null
  echo "pm2 restart झाले."
elif [ -n "${SATSANG_SERVICE:-}" ] && command -v systemctl >/dev/null 2>&1; then
  sudo systemctl restart "$SATSANG_SERVICE"
  echo "systemd ($SATSANG_SERVICE) restart झाले."
else
  echo "app restart करा: pm2 restart all  किंवा  sudo systemctl restart <service>"
fi

echo "== health"
sleep 3
curl -s "http://localhost:${PORT:-43123}/api/health" || echo "(health उत्तर नाही — app सुरू झाले का ते पाहा)"
echo
echo "== deploy झाले: $(git log --oneline -1)"
