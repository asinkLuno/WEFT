"""YAML top-level ``aqueduct`` field -> custom calendar loading."""

import textwrap
from pathlib import Path

import pytest

from weft_backend.aqueduct import _BUILTIN_AQUEDUCTS, AQUEDUCTS
from weft_backend.dao import load_dao


@pytest.fixture(autouse=True)
def _reset_aqueducts():
    AQUEDUCTS.clear()
    AQUEDUCTS.update(_BUILTIN_AQUEDUCTS)
    yield
    AQUEDUCTS.clear()
    AQUEDUCTS.update(_BUILTIN_AQUEDUCTS)


def _write(path: Path, text: str) -> Path:
    path.write_text(textwrap.dedent(text), encoding="utf-8")
    return path


def test_builtin_english_gregorian_is_selectable(tmp_path: Path) -> None:
    story = _write(
        tmp_path / "story.yml",
        """
        story:
          title: English calendar
          date_mode: gregorian_en
        drift:
          Chapter:
            Arrival:
              start_time: [2024, 1, 15, 12, 30]
        """,
    )

    dao = load_dao(story)

    assert dao.story.date_mode == "gregorian_en"
    assert (
        dao.drift["Chapter"][0].start_time_display
        == "2024 years, 1 month, 15 days, 12 hours, 30 minutes"
    )


def test_user_aqueduct_loads_from_story_relative_path(tmp_path: Path) -> None:
    _write(
        tmp_path / "moon_calendar.py",
        """
        from sys import maxsize
        from weft_backend.aqueduct import Aqueduct, Brick

        aqueduct = Aqueduct([
            Brick("纪元", lambda ctx: maxsize),
            Brick("月轮", lambda ctx: 10),
            Brick("日", lambda ctx: 20),
        ])
        """,
    )
    story = _write(
        tmp_path / "story.yml",
        """
        aqueduct:
          moon: ./moon_calendar.py
        story:
          title: Moon
          date_mode: moon
        drift:
          第一幕:
            月升:
              start_time: [3, 2, 1]
        """,
    )

    dao = load_dao(story)

    assert dao.story.date_mode == "moon"
    assert dao.drift["第一幕"][0].start_time_display == "3纪元2月轮1日"


def test_user_aqueduct_must_export_an_aqueduct_instance(tmp_path: Path) -> None:
    _write(tmp_path / "bad.py", "aqueduct = object()\n")
    story = _write(
        tmp_path / "story.yml",
        """
        aqueduct:
          bad: ./bad.py
        story:
          title: Bad
          date_mode: bad
        """,
    )

    with pytest.raises(ValueError, match="必须导出 Aqueduct 实例"):
        load_dao(story)


def test_aqueduct_registry_resets_between_story_loads(tmp_path: Path) -> None:
    _write(
        tmp_path / "custom.py",
        """
        from sys import maxsize
        from weft_backend.aqueduct import Aqueduct, Brick
        aqueduct = Aqueduct([Brick("turn", lambda ctx: maxsize)])
        """,
    )
    custom_story = _write(
        tmp_path / "custom.yml",
        """
        aqueduct:
          custom: ./custom.py
        story:
          title: Custom
          date_mode: custom
        """,
    )
    plain_story = _write(
        tmp_path / "plain.yml",
        """
        story:
          title: Plain
          date_mode: custom
        """,
    )

    load_dao(custom_story)
    with pytest.raises(ValueError, match="不支持的 date_mode"):
        load_dao(plain_story)
