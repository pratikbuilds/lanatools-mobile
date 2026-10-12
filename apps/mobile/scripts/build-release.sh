#!/usr/bin/env bash
# Builds a signed release APK at apps/mobile/dist/lanatools-<version>.apk.
#
# Signing comes from LANATOOLS_RELEASE_KEYSTORE, LANATOOLS_RELEASE_KEY_ALIAS,
# LANATOOLS_RELEASE_KEYSTORE_PASSWORD and LANATOOLS_RELEASE_KEY_PASSWORD, read
# from $LANATOOLS_RELEASE_ENV (default ~/.config/lanatools-mobile/release.env)
# when that file exists. Privy identifies the app by package name and URL
# scheme, so no certificate registration is needed.
set -euo pipefail

cd "$(dirname "$0")/.."
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"

RELEASE_ENV="${LANATOOLS_RELEASE_ENV:-$HOME/.config/lanatools-mobile/release.env}"
if [ -f "$RELEASE_ENV" ]; then
  # shellcheck source=/dev/null
  . "$RELEASE_ENV"
fi
for name in LANATOOLS_RELEASE_KEYSTORE LANATOOLS_RELEASE_KEY_ALIAS \
  LANATOOLS_RELEASE_KEYSTORE_PASSWORD LANATOOLS_RELEASE_KEY_PASSWORD; do
  if [ -z "${!name:-}" ]; then
    echo "build-release: $name is not set (see $RELEASE_ENV)" >&2
    exit 1
  fi
done
export LANATOOLS_RELEASE_KEYSTORE LANATOOLS_RELEASE_KEY_ALIAS \
  LANATOOLS_RELEASE_KEYSTORE_PASSWORD LANATOOLS_RELEASE_KEY_PASSWORD

if ! grep -q '^EXPO_PUBLIC_PRIVY_CLIENT_ID=.\+' .env 2>/dev/null; then
  echo "build-release: EXPO_PUBLIC_PRIVY_CLIENT_ID is empty in .env" >&2
  exit 1
fi

VERSION="$(node -p "require('./app.json').expo.version")"
OUT="dist/lanatools-$VERSION.apk"

npx expo prebuild --platform android --no-install
# arm64 only by default: every current phone and the Solana Seeker. A
# universal build for the x86_64 emulator is
# LANATOOLS_RELEASE_ABIS=arm64-v8a,armeabi-v7a,x86,x86_64.
(cd android && ./gradlew assembleRelease --quiet \
  "-PreactNativeArchitectures=${LANATOOLS_RELEASE_ABIS:-arm64-v8a}")

mkdir -p dist
cp android/app/build/outputs/apk/release/app-release.apk "$OUT"

BUILD_TOOLS="$(ls -d "$ANDROID_HOME"/build-tools/* | sort -V | tail -1)"
echo
echo "Built $OUT"
"$BUILD_TOOLS/apksigner" verify --print-certs "$OUT" | grep 'SHA-256' | sed 's/^/  /'
