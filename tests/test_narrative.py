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
    assert dao.narrative["view"].drifts[0].moais == ["actor", "observer"]
    assert dao.narrative["view"].drifts[1].moais == ["observer"]
    assert dao.drift["first"][0].moais == ["actor"]
    assert dao.drift["second"][0].moais is None
    assert dao.moai["observer"].journal == {
        "first/event": ("1日", "2日"),
        "second/milestone": ("1月", None),
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


def test_drift_rejects_end_before_start():
    raw = _raw()
    raw["drift"]["first"]["event"]["end_time"] = [2000, 1, 1]

    with pytest.raises(ValueError, match="end_time 不能早于 start_time"):
        Dao.from_dict(raw)


def test_empty_drift_group_is_kept_and_sorted_last():
    raw = _raw()
    raw["drift"]["empty"] = {}

    dao = Dao.from_dict(raw)

    assert dao.drift["empty"] == []
    assert list(dao.drift)[-1] == "empty"


def test_same_title_in_different_groups_has_distinct_journal_entries():
    raw = _raw()
    raw["drift"]["second"]["event"] = {"start_time": [2000, 2, 2]}
    raw["narrative"]["view"]["subject"] = ["first", "second"]

    dao = Dao.from_dict(raw)

    assert "first/event" in dao.moai["observer"].journal
    assert "second/event" in dao.moai["observer"].journal


def test_narrative_observers_do_not_leak_into_shared_drifts():
    raw = _raw()
    raw["moai"]["other"] = {"base_time": [1999, 1, 1]}
    raw["narrative"]["other-view"] = {
        "subject": ["first"],
        "observer": "other",
    }

    dao = Dao.from_dict(raw)

    assert dao.narrative["view"].drifts[0].moais == ["actor", "observer"]
    assert dao.narrative["other-view"].drifts[0].moais == ["actor", "other"]
    assert dao.drift["first"][0].moais == ["actor"]


@pytest.mark.parametrize(
    "bad_time",
    [[], [2000, 1, 1, 0, 0, 0, 0], [2000, "January", 1]],
)
def test_invalid_time_lists_are_rejected_while_loading(bad_time):
    raw = _raw()
    raw["drift"]["first"]["event"]["start_time"] = bad_time

    with pytest.raises(ValueError, match="时间"):
        Dao.from_dict(raw)
