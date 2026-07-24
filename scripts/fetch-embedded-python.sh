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
TEMP="$(mktemp -d)"
trap 'rm -rf "$TEMP"' EXIT
RELEASE_JSON="$TEMP/release.json"
API_CURL_ARGS=()
if [ -n "${GITHUB_TOKEN:-}" ]; then
  API_CURL_ARGS=(
    -H "Authorization: Bearer $GITHUB_TOKEN"
    -H "X-GitHub-Api-Version: 2022-11-28"
  )
fi
curl -fsSL "${API_CURL_ARGS[@]}" \
  "https://api.github.com/repos/$REPO/releases/latest" \
  -o "$RELEASE_JSON"

# Match the regular GIL build exactly. Avoid a long curl/grep/head pipeline:
# with pipefail, an early-closing head can surface as SIGPIPE on macOS runners.
URL="$(
  grep '"browser_download_url"' "$RELEASE_JSON" |
    grep -iE "cpython-${PYVER}\.[0-9]+[^\"/]*-${ARCH}-install_only_stripped\\.tar\\.gz" |
    grep -iv 'freethreaded' |
    sed -n 's/.*"\(https[^"]*\)".*/\1/p'
)"
if [ -z "$URL" ]; then
  echo "ERROR: no asset matched cpython-${PYVER} ${ARCH}-install_only_stripped" >&2
  exit 1
fi
if [ "$(printf '%s\n' "$URL" | wc -l | tr -d ' ')" -ne 1 ]; then
  echo "ERROR: multiple assets matched cpython-${PYVER} ${ARCH}-install_only_stripped" >&2
  printf '%s\n' "$URL" >&2
  exit 1
fi
echo "    $URL"

mkdir -p "$PYEMBED"
curl -fL "$URL" -o "$TEMP/cpython.tar.gz"
rm -rf "$DEST"
tar -xzf "$TEMP/cpython.tar.gz" -C "$TEMP"
mv "$TEMP/python" "$DEST"

echo "==> embedded python at $DEST"
if [ -x "$DEST/python.exe" ]; then
  PYTHON="$DEST/python.exe"
else
  PYTHON="$DEST/bin/python3"
fi
"$PYTHON" --version
PY_MAJOR_MINOR="$("$PYTHON" -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')"
POINTER_WIDTH="$("$PYTHON" -c 'import struct; print(struct.calcsize("P") * 8)')"
if [[ "$ARCH" == *-pc-windows-* ]]; then
  LIB_NAME="python${PY_MAJOR_MINOR/./}"
  LIB_DIR="$DEST/libs"
  PYTHON_CONFIG_PATH="$(cygpath -w "$PYTHON")"
  LIB_DIR_CONFIG_PATH="$(cygpath -w "$LIB_DIR")"
else
  LIB_NAME="python$PY_MAJOR_MINOR"
  LIB_DIR="$DEST/lib"
  PYTHON_CONFIG_PATH="$PYTHON"
  LIB_DIR_CONFIG_PATH="$LIB_DIR"
fi

# python-build-standalone keeps its build-time /install prefix in sysconfig.
# Give PyO3 the relocated library directory explicitly so linking uses the
# interpreter that will actually be bundled.
PYO3_CONFIG="$PYEMBED/pyo3-config.txt"
{
  printf 'implementation=CPython\n'
  printf 'version=%s\n' "$PY_MAJOR_MINOR"
  printf 'shared=true\n'
  printf 'abi3=false\n'
  printf 'lib_name=%s\n' "$LIB_NAME"
  printf 'lib_dir=%s\n' "$LIB_DIR_CONFIG_PATH"
  printf 'executable=%s\n' "$PYTHON_CONFIG_PATH"
  printf 'pointer_width=%s\n' "$POINTER_WIDTH"
  printf 'build_flags=\n'
  printf 'suppress_build_script_link_lines=false\n'
} > "$PYO3_CONFIG"

if [ -n "${GITHUB_ENV:-}" ]; then
  if [[ "$ARCH" == *-pc-windows-* ]]; then
    PYO3_CONFIG_ENV_PATH="$(cygpath -w "$PYO3_CONFIG")"
  else
    PYO3_CONFIG_ENV_PATH="$PYO3_CONFIG"
  fi
  printf 'PYO3_PYTHON=%s\n' "$PYTHON_CONFIG_PATH" >> "$GITHUB_ENV"
  printf 'PYO3_CONFIG_FILE=%s\n' "$PYO3_CONFIG_ENV_PATH" >> "$GITHUB_ENV"
  if [[ "$ARCH" == *-unknown-linux-* ]]; then
    printf 'LD_LIBRARY_PATH=%s%s\n' \
      "$LIB_DIR" "${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}" >> "$GITHUB_ENV"
  fi
fi

echo "==> installing WEFT and runtime dependencies into embedded python"
uv pip install --python "$PYTHON" "$ROOT"
