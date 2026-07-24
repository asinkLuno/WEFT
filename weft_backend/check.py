"""Shared machine-readable story inspection helpers."""

from __future__ import annotations

from pathlib import Path

from weft_backend.dao import load_dao
from weft_backend.errors import normalize_error


def inspect_story(path: str | Path) -> dict[str, object]:
    """Load a story and return a compact JSON-safe summary."""
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


def validate_story(path: str | Path) -> dict[str, object]:
    """Validate a story without raising, returning a structured result."""
    try:
        return inspect_story(path)
    except Exception as exc:
        error = normalize_error(exc, path)
        return {
            "valid": False,
            "path": str(Path(path)),
            # Keep the original text fields for older MCP clients.
            "error": str(error),
            "error_type": type(error).__name__,
            "errors": [error.to_dict()],
        }
