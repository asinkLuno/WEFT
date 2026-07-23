#!/usr/bin/env bash
# Build a distributable WEFT **wheel** (pip-installable Python app).
# For the cross-platform standalone installer, see scripts/fetch-embedded-python.sh
# + `cargo tauri build` (documented in the README / plan).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

bash scripts/stage-frontend.sh

echo "==> building wheel + sdist"
uv build

echo "==> done:"
ls -1 dist/*.whl
