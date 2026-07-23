"""pytauri command layer (Path C) — serves the frontend via pyInvoke commands.

Each command returns the same pydantic model shape the old HTTP endpoints did,
so the frontend's data shape is unchanged. Commands read from the module-level
:data:`~weft_backend.state.STATE`.
"""

from __future__ import annotations

from pytauri import Commands

from weft_backend.dao import Drift, Moai, Narrative, Story
from weft_backend.graph import LinkGraph
from weft_backend.state import STATE

commands = Commands()


def _require_dao():
    if STATE.dao is None or STATE.link_graph is None:
        raise RuntimeError("no story loaded")
    return STATE.dao, STATE.link_graph


@commands.command()
async def get_story() -> Story:
    dao, _ = _require_dao()
    return dao.story


@commands.command()
async def get_moai() -> dict[str, Moai]:
    dao, _ = _require_dao()
    return dao.moai


@commands.command()
async def get_drift() -> dict[str, list[Drift]]:
    dao, _ = _require_dao()
    return dao.drift


@commands.command()
async def get_narrative() -> dict[str, Narrative]:
    dao, _ = _require_dao()
    return dao.narrative


@commands.command()
async def get_moai_link() -> LinkGraph:
    _, link_graph = _require_dao()
    return link_graph
