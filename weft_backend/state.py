"""Module-level app state for the pytauri command layer (Path C).

Holds the loaded DAO + derived link graph. Commands read from ``STATE``; story
load/reload mutates it (mirrors the old FastAPI ``app.state.dao``).
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from weft_backend.dao import Dao, load_dao
from weft_backend.graph import LinkGraph, build_link_graph


@dataclass
class AppState:
    dao: Dao | None = None
    link_graph: LinkGraph | None = None
    story_path: Path | None = None

    def load(self, path: str | Path) -> None:
        self.story_path = Path(path)
        self.dao = load_dao(path)
        self.link_graph = build_link_graph(self.dao)

    @property
    def loaded(self) -> bool:
        return self.dao is not None


STATE: AppState = AppState()
