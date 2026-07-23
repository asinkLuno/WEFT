"""Machine-friendly story validation command."""

from __future__ import annotations

import argparse
import json
import sys
from collections.abc import Sequence
from pathlib import Path

from weft_backend.dao import load_dao


def check(path: str | Path) -> dict[str, object]:
    """Load and validate a story, returning a compact JSON-safe summary."""

    dao = load_dao(path)
    return {
        "valid": True,
        "path": str(Path(path)),
        "title": dao.story.title,
        "moai_count": len(dao.moai),
        "drift_group_count": len(dao.drift),
        "drift_count": sum(len(events) for events in dao.drift.values()),
        "narrative_count": len(dao.narrative),
    }


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="weft-check",
        description="Validate a WEFT YAML/JSON/TOML story file.",
    )
    parser.add_argument("path", type=Path, help="story file to validate")
    args = parser.parse_args(argv)

    try:
        result = check(args.path)
    except Exception as exc:
        print(
            json.dumps(
                {
                    "valid": False,
                    "path": str(args.path),
                    "error": str(exc),
                    "error_type": type(exc).__name__,
                },
                ensure_ascii=False,
            ),
            file=sys.stderr,
        )
        return 1

    print(json.dumps(result, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
