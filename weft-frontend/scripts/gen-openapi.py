#!/usr/bin/env python3
"""Dump the FastAPI OpenAPI schema to JSON for TS type generation.

Builds the app with a placeholder YAML path (the lifespan never runs, so no
real data is needed) and writes ``app.openapi()`` to the given path.
"""

import json
import sys
from pathlib import Path

from weft_backend.app import make_app


def main() -> None:
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("lib/openapi.json")
    app = make_app("__gen__", "127.0.0.1", 8001)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(app.openapi(), ensure_ascii=False, indent=2))
    print(f"wrote {out}")


if __name__ == "__main__":
    main()
