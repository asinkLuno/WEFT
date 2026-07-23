"""Shared application state used by the PyTauri command layer."""

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
        story_path = Path(path)
        dao = load_dao(story_path)
        link_graph = build_link_graph(dao)

        # Publish a new snapshot only after it has loaded successfully. This
        # keeps the current story and its watcher intact when a replacement
        # file is invalid.
        self.story_path = story_path
        self.dao = dao
        self.link_graph = link_graph

    @property
    def loaded(self) -> bool:
        return self.dao is not None


STATE: AppState = AppState()
