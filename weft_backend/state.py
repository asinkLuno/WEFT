"""Shared application state used by the PyTauri command layer."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

from weft_backend.dao import Dao, load_dao
from weft_backend.errors import WeftError, normalize_error
from weft_backend.graph import LinkGraph, build_link_graph


@dataclass
class AppState:
    dao: Dao | None = None
    link_graph: LinkGraph | None = None
    story_path: Path | None = None
    last_error: WeftError | None = None
    last_reload_at: datetime | None = field(default=None)

    def load(self, path: str | Path) -> None:
        story_path = Path(path)
        try:
            dao = load_dao(story_path)
            link_graph = build_link_graph(dao)
        except Exception as exc:
            error = normalize_error(exc, story_path)
            self.last_error = error
            if error is exc:
                raise
            raise error from exc

        # Publish a new snapshot only after it has loaded successfully. This
        # keeps the current story and its watcher intact when a replacement
        # file is invalid.
        self.story_path = story_path
        self.dao = dao
        self.link_graph = link_graph
        self.last_error = None
        self.last_reload_at = datetime.now()

    def clear(self) -> None:
        """Drop the current story, leaving preferences (e.g. `watching`) intact.

        After `clear`, the desktop UI returns to the landing screen; the
        watcher loop observes `story_path is None` and idles.
        """

        self.dao = None
        self.link_graph = None
        self.story_path = None
        self.last_error = None
        self.last_reload_at = None

    @property
    def loaded(self) -> bool:
        return self.dao is not None


STATE: AppState = AppState()
