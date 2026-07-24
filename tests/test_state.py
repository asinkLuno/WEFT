from pathlib import Path

import pytest

from weft_backend.errors import ParseError
from weft_backend.state import AppState


def test_failed_reload_keeps_snapshot_and_exposes_structured_error(
    tmp_path: Path,
) -> None:
    story = tmp_path / "story.yml"
    story.write_text("story:\n  title: Valid\n", encoding="utf-8")
    state = AppState()
    state.load(story)
    previous_dao = state.dao
    previous_graph = state.link_graph

    story.write_text("story:\n  title: [\n", encoding="utf-8")
    with pytest.raises(ParseError):
        state.load(story)

    assert state.dao is previous_dao
    assert state.link_graph is previous_graph
    assert state.last_error is not None
    assert state.last_error.code == "YAML_SYNTAX"

    story.write_text("story:\n  title: Valid again\n", encoding="utf-8")
    state.load(story)

    assert state.dao is not previous_dao
    assert state.last_error is None
