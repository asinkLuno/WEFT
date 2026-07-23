#!/usr/bin/env bash
# Provision a portable CPython (python-build-standalone) for the standalone build.
# Usage: scripts/fetch-embedded-python.sh [python-version] [rust-target]
#   python-version defaults to 3.13
#   rust-target defaults to x86_64-unknown-linux-gnu
#      (CI overrides: x86_64-pc-windows-msvc, aarch64-apple-darwin, etc.)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PYEMBED="$ROOT/src-tauri/pyembed"
DEST="$PYEMBED/python"

PYVER="${1:-3.13}"
ARCH="${2:-x86_64-unknown-linux-gnu}"
REPO="astral-sh/python-build-standalone"

echo "==> finding cpython $PYVER ($ARCH) in latest $REPO release"
URL="$(
  curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" |
    grep '"browser_download_url"' |
    grep -iE "cpython-${PYVER}\.[0-9].*${ARCH}-install_only_stripped" |
    sed 's/.*\(https[^"]*\).*/\1/' | head -1
)"
if [ -z "$URL" ]; then
  echo "ERROR: no asset matched cpython-${PYVER} ${ARCH}-install_only_stripped" >&2
  exit 1
fi
echo "    $URL"

mkdir -p "$PYEMBED"
TEMP="$(mktemp -d)"
curl -fL "$URL" -o "$TEMP/cpython.tar.gz"
rm -rf "$DEST"
tar -xzf "$TEMP/cpython.tar.gz" -C "$TEMP"
mv "$TEMP/python" "$DEST"
rm -rf "$TEMP"

echo "==> embedded python at $DEST"
"$DEST/bin/python3" --version

echo "==> installing WEFT and runtime dependencies into embedded python"
uv pip install --python "$DEST/bin/python3" "$ROOT"
