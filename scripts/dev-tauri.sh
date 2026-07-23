#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
PROJECT_PYTHON="$PROJECT_ROOT/.venv/bin/python"

if [[ ! -x "$PROJECT_PYTHON" ]]; then
  echo "Python virtual environment not found: $PROJECT_PYTHON" >&2
  echo "Run 'uv sync' in the project root first." >&2
  exit 1
fi

PYTHON_LIB_DIR="$("$PROJECT_PYTHON" -c \
  'import sysconfig; print(sysconfig.get_config_var("LIBDIR") or "")')"

if [[ ! -d "$PYTHON_LIB_DIR" ]]; then
  echo "Python library directory not found: $PYTHON_LIB_DIR" >&2
  exit 1
fi

export PYO3_PYTHON="$PROJECT_PYTHON"
export LD_LIBRARY_PATH="$PYTHON_LIB_DIR${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"

cd "$PROJECT_ROOT"
exec cargo tauri dev "$@"
