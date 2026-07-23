"""Pure-Python handlers shared by the PyTauri command registration layer."""

from __future__ import annotations

from weft_backend.dao import Drift, Moai, Narrative, Story
from weft_backend.graph import LinkGraph
from weft_backend.state import STATE


def _require_dao():
    if STATE.dao is None or STATE.link_graph is None:
        raise RuntimeError("no story loaded")
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
