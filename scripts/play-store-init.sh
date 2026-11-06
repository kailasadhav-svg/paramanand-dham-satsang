#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/play-store"
if [ -f app/build.gradle ]; then
  echo "Android TWA project already present under play-store/"
  echo "Build with: npm run play:build"
  exit 0
fi
echo "Project missing — regenerate with Bubblewrap (JDK 17 + Android SDK required)."
echo "See docs/PLAY_STORE.md"
exit 1
