"""Shared machine-readable story inspection helpers."""

from __future__ import annotations

from pathlib import Path

from weft_backend.dao import load_dao


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
        return {
            "valid": False,
            "path": str(Path(path)),
            "error": str(exc),
            "error_type": type(exc).__name__,
        }
