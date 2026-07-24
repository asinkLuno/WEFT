"""Pure-Python handlers shared by the PyTauri command registration layer."""

from __future__ import annotations

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


async def get_story() -> Story:
    dao, _ = _require_dao()
    return dao.story


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
