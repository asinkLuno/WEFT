"""Structured diagnostics for files, syntax, schema, references, and time."""

from pathlib import Path

import pytest

from weft_backend.check import validate_story
from weft_backend.dao import load_dao
from weft_backend.errors import (
    FileError,
    ParseError,
    ReferenceError,
    SchemaError,
    TimelineError,
)


def _write(path: Path, text: str) -> Path:
    path.write_text(text, encoding="utf-8")
    return path


def test_yaml_syntax_error_has_source_line_and_column(tmp_path: Path) -> None:
    story = _write(
        tmp_path / "broken.yml",
        "story:\n  title: Broken\ndrift:\n  chapter: [\n",
    )

    with pytest.raises(ParseError) as captured:
        load_dao(story)

    error = captured.value
    assert error.code == "YAML_SYNTAX"
    assert error.stage == "parse"
    assert error.source == str(story)
    assert error.line == 5
    assert error.column == 1


def test_yaml_duplicate_key_is_rejected_instead_of_overwritten(
    tmp_path: Path,
) -> None:
    story = _write(
        tmp_path / "duplicate.yml",
        "story:\n  title: First\n  title: Second\n",
    )

    with pytest.raises(ParseError) as captured:
        load_dao(story)

    error = captured.value
    assert error.code == "YAML_SYNTAX"
    assert "duplicate key 'title'" in error.message
    assert error.line == 3
    assert error.column == 3


def test_semantic_error_has_model_path_and_yaml_location(tmp_path: Path) -> None:
    story = _write(
        tmp_path / "missing-reference.yml",
        """story:
  title: Missing reference
drift:
  chapter:
    arrival:
      start_time: [2025, 1, 1]
      moais: [nobody]
""",
    )

    with pytest.raises(ReferenceError) as captured:
        load_dao(story)

    error = captured.value
    assert error.code == "DRIFT_MOAI_NOT_FOUND"
    assert error.path == ("drift", "chapter", "arrival", "moais")
    assert error.line == 7
    assert error.column == 14
    assert error.details == {"moai": "nobody"}


def test_missing_required_time_is_a_schema_error(tmp_path: Path) -> None:
    story = _write(
        tmp_path / "missing-time.yml",
        """story:
  title: Missing time
drift:
  chapter:
    arrival:
      description: no time
""",
    )

    with pytest.raises(SchemaError) as captured:
        load_dao(story)

    error = captured.value
    assert error.code == "DRIFT_START_REQUIRED"
    assert error.path == ("drift", "chapter", "arrival", "start_time")
    # Missing fields resolve to their closest existing YAML parent.
    assert error.line == 6


def test_end_before_start_is_a_timeline_error(tmp_path: Path) -> None:
    story = _write(
        tmp_path / "backwards.yml",
        """story:
  title: Backwards
drift:
  chapter:
    arrival:
      start_time: [2025, 1, 2]
      end_time: [2025, 1, 1]
""",
    )

    with pytest.raises(TimelineError) as captured:
        load_dao(story)

    error = captured.value
    assert error.code == "DRIFT_END_BEFORE_START"
    assert error.path == ("drift", "chapter", "arrival", "end_time")
    assert error.line == 7


def test_missing_file_is_a_file_error(tmp_path: Path) -> None:
    missing = tmp_path / "missing.yml"

    with pytest.raises(FileError) as captured:
        load_dao(missing)

    assert captured.value.code == "FILE_NOT_FOUND"
    assert captured.value.source == str(missing)


def test_validate_story_returns_structured_and_legacy_errors(
    tmp_path: Path,
) -> None:
    story = _write(tmp_path / "root.yml", "- not\n- a\n- mapping\n")

    result = validate_story(story)

    assert result["valid"] is False
    assert result["error_type"] == "SchemaError"
    assert isinstance(result["error"], str)
    assert result["errors"] == [
        {
            "code": "ROOT_NOT_MAPPING",
            "stage": "schema",
            "message": "故事文件的顶层必须是映射",
            "source": str(story),
            "line": 1,
            "column": 1,
        }
    ]
