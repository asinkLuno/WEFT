"""Pure-Python handlers shared by the PyTauri command registration layer."""

from __future__ import annotations

from datetime import datetime

from weft_backend.aqueduct import CalendarMetadata, calendar_metadata_for
from weft_backend.dao import Drift, Moai, Narrative, Story
from weft_backend.errors import StateError
from weft_backend.graph import LinkGraph
from weft_backend.state import STATE


def _require_dao():
    if STATE.dao is None or STATE.link_graph is None:
        raise StateError(
            "STORY_NOT_LOADED",
            "尚未加载故事",
            hint="先在桌面应用中打开一个 WEFT 故事文件",
        )
    return STATE.dao, STATE.link_graph


async def has_story() -> bool:
    """Return whether a complete story snapshot is ready for queries."""

    return STATE.dao is not None and STATE.link_graph is not None


async def get_story() -> Story:
    dao, _ = _require_dao()
    return dao.story


async def get_calendar_metadata() -> CalendarMetadata:
    dao, _ = _require_dao()
    return calendar_metadata_for(dao.story.date_mode)


async def get_moai() -> dict[str, Moai]:
    dao, _ = _require_dao()
    return dao.moai


async def get_drift() -> dict[str, list[Drift]]:
    dao, _ = _require_dao()
    return dao.drift


async def get_narrative() -> dict[str, Narrative]:
    dao, _ = _require_dao()
    return dao.narrative


async def get_moai_link() -> LinkGraph:
    _, link_graph = _require_dao()
    return link_graph


async def get_load_error() -> dict[str, object] | None:
    """Return the most recent story load error for the desktop UI."""

    return STATE.last_error.to_dict() if STATE.last_error is not None else None


async def close_story() -> None:
    """Drop the current story so the desktop UI returns to the landing screen."""

    STATE.clear()


async def reload_story() -> dict[str, object]:
    """Force-reload the current story file. Raises on failure."""

    if STATE.story_path is None:
        raise StateError(
            "STORY_NOT_LOADED",
            "尚未加载故事",
            hint="先在桌面应用中打开一个 WEFT 故事文件",
        )
    STATE.load(STATE.story_path)
    return {
        "story_title": STATE.dao.story.title if STATE.dao else None,
        "last_reload_at": _iso(STATE.last_reload_at),
    }


async def get_app_state() -> dict[str, object]:
    """Surface current story metadata + watcher state to the desktop UI."""

    return {
        "story_path": str(STATE.story_path) if STATE.story_path else None,
        "story_title": STATE.dao.story.title if STATE.dao else None,
        "last_reload_at": _iso(STATE.last_reload_at),
    }


def _iso(moment: datetime | None) -> str | None:
    return moment.isoformat() if moment is not None else None
