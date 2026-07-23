#!/usr/bin/env bash
# Regenerate frontend TS types from the backend model schema and fail if the
# committed lib/schema.ts would change. Invoked by the pre-commit `gen-types`
# hook whenever a weft_backend/*.py file is staged.
set -euo pipefail
cd "$(dirname "$0")/.."

npm run gen:types

if ! git diff --quiet -- lib/schema.ts; then
  echo >&2
  echo "  weft-frontend/lib/schema.ts is out of date — just regenerated." >&2
  echo "  Re-stage it and retry the commit:" >&2
  echo "    git add weft-frontend/lib/schema.ts" >&2
  echo >&2
  exit 1
fi
