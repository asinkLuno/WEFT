#!/usr/bin/env bash
# Build the Next frontend and stage it into weft_backend/tauri_app/frontend/ —
# the single dir served by BOTH the pytauri-wheel path and the standalone build.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# node/yarn via nvm (the build may be invoked without an interactive shell).
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
cd "$ROOT"

echo "==> building frontend (Next static export)"
(cd weft-frontend && yarn build)

echo "==> staging frontend -> weft_backend/tauri_app/frontend"
rm -rf weft_backend/tauri_app/frontend
mkdir -p weft_backend/tauri_app/frontend
cp -r weft-frontend/out/. weft_backend/tauri_app/frontend/
