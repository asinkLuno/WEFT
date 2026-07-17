import pytest

from weft_backend.dao import Dao


def _raw() -> dict:
    return {
        "story": {"title": "narrative test"},
        "moai": {
            "observer": {
                "base_time": [2000, 1, 1],
                "description": "the observer",
            },
            "actor": {"description": "an actor"},
        },
        "drift": {
            "first": {
                "event": {
                    "start_time": [2000, 1, 2],
                    "end_time": [2000, 1, 3],
                    "moais": ["actor"],
                }
            },
            "second": {"milestone": {"start_time": [2000, 2, 1]}},
        },
        "narrative": {"view": {"subject": ["first", "second"], "observer": "observer"}},
    }


def test_narrative_adds_observer_and_calculates_offsets():
    dao = Dao.from_dict(_raw())

    assert dao.narrative["view"].subject == ["first", "second"]
    assert dao.drift["first"][0].moais == ["actor", "observer"]
    assert dao.drift["second"][0].moais == ["observer"]
    assert dao.moai["observer"].journal == {
        "event": ("1日", "2日"),
        "milestone": ("1月", None),
    }


def test_nested_narrative_is_supported():
    raw = _raw()
    raw["drift"]["narrative"] = raw.pop("narrative")

    dao = Dao.from_dict(raw)

    assert dao.narrative["view"].observer == "observer"
    assert "narrative" not in dao.drift


def test_narrative_rejects_unknown_references():
    raw = _raw()
    raw["narrative"]["view"]["subject"] = ["missing"]
    with pytest.raises(KeyError, match="不存在的 drift"):
        Dao.from_dict(raw)

    raw = _raw()
    raw["narrative"]["view"]["observer"] = "missing"
    with pytest.raises(KeyError, match="observer moai"):
        Dao.from_dict(raw)
