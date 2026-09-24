#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="22.16.0"
OUT="$ROOT/dist/desktop-g1/runtime/node"
TMP="$ROOT/dist/desktop-g1/node-download"
mkdir -p "$OUT" "$TMP"

case "$(uname -s)-$(uname -m)" in
  Linux-x86_64) ARCH="linux-x64";;
  Linux-aarch64|Linux-arm64) ARCH="linux-arm64";;
  *) echo "DESKTOP-G1 Node staging currently certifies Linux x64/arm64 only" >&2; exit 2;;
esac

BASE="https://nodejs.org/dist/v$VERSION"
ARCHIVE="node-v$VERSION-$ARCH.tar.xz"
curl --fail --location --silent --show-error "$BASE/SHASUMS256.txt" -o "$TMP/SHASUMS256.txt"
curl --fail --location --silent --show-error "$BASE/$ARCHIVE" -o "$TMP/$ARCHIVE"
(
  cd "$TMP"
  grep "  $ARCHIVE$" SHASUMS256.txt | sha256sum -c -
)
tar -xJf "$TMP/$ARCHIVE" -C "$TMP"
cp "$TMP/node-v$VERSION-$ARCH/bin/node" "$OUT/node"
cp "$TMP/node-v$VERSION-$ARCH/LICENSE" "$OUT/LICENSE.node"
chmod +x "$OUT/node"
test "$("$OUT/node" --version)" = "v$VERSION"
rm -rf "$TMP"
echo "staged Node $VERSION for $ARCH"
