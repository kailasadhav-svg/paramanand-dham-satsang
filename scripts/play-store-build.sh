#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/play-store"
export JAVA_HOME="${JAVA_HOME:-/usr/lib/jvm/java-17-openjdk-amd64}"
export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-$HOME/android-sdk}"
export ANDROID_HOME="$ANDROID_SDK_ROOT"
echo "sdk.dir=$ANDROID_SDK_ROOT" > local.properties
./gradlew --no-daemon bundleRelease
mkdir -p dist
cp -f app/build/outputs/bundle/release/app-release.aab "dist/ajapa-samvad.aab"
ls -lh dist/ajapa-samvad.aab
echo "Upload dist/ajapa-samvad.aab to Play Console"
