import pytest

from weft_backend.dao import Dao


def _raw() -> dict:
    return {
        "story": {"title": "narrative test"},
        "moai": {
            "observer": {"base_time": [2000, 1, 1]},
            "actor": {},
        },
        "drift": {
            "chapter-one": {
                "arrival": {
                    "start_time": [2000, 1, 2],
                    "moais": ["observer", "actor"],
                },
                "conversation": {
                    "start_time": [2000, 1, 3],
                    "moais": ["observer"],
                },
            },
            "possibilities": {
                "observed": {
                    "start_time": [2000, 2, 1],
                    "moais": ["observer"],
                },
                "off-screen": {
                    "start_time": [2000, 2, 2],
                    "moais": ["actor"],
                },
            },
        },
        "narrative": {
            "outline": {
                "subject": ["chapter-one", "possibilities/observed"],
                "observer": "observer",
            }
        },
    }


def test_narrative_resolves_groups_and_individual_events_in_outline_order() -> None:
    dao = Dao.from_dict(_raw())

    narrative = dao.narrative["outline"]
    assert narrative.subject == ["chapter-one", "possibilities/observed"]
    assert [drift.id for drift in narrative.drifts] == [
        "chapter-one/arrival",
        "chapter-one/conversation",
        "possibilities/observed",
    ]


def test_narrative_keeps_resolved_drifts_independent_without_adding_observer() -> None:
    dao = Dao.from_dict(_raw())

    source = dao.drift["chapter-one"][0]
    resolved = dao.narrative["outline"].drifts[0]
    assert resolved is not source
    assert resolved.moais == source.moais == ["observer", "actor"]


def test_individual_event_reference_does_not_require_observer_in_siblings() -> None:
    raw = _raw()
    raw["narrative"]["outline"]["subject"] = ["possibilities/observed"]

    dao = Dao.from_dict(raw)

    assert [drift.id for drift in dao.narrative["outline"].drifts] == [
        "possibilities/observed"
    ]


def test_whole_group_requires_observer_in_every_event() -> None:
    raw = _raw()
    raw["narrative"]["outline"]["subject"] = ["possibilities"]

    with pytest.raises(
        ValueError,
        match=r"observer.*未在以下事件中在场.*possibilities/off-screen",
    ):
        Dao.from_dict(raw)


def test_narrative_reports_every_event_where_observer_is_absent() -> None:
    raw = _raw()
    raw["drift"]["possibilities"]["another-off-screen"] = {
        "start_time": [2000, 2, 3],
        "moais": ["actor"],
    }
    raw["narrative"]["outline"]["subject"] = ["possibilities"]

    with pytest.raises(ValueError) as exc_info:
        Dao.from_dict(raw)

    message = str(exc_info.value)
    assert "possibilities/off-screen" in message
    assert "possibilities/another-off-screen" in message


@pytest.mark.parametrize("reference", ["missing", "possibilities/missing"])
def test_narrative_rejects_unknown_group_or_event(reference: str) -> None:
    raw = _raw()
    raw["narrative"]["outline"]["subject"] = [reference]

    with pytest.raises(KeyError, match="不存在的 drift 分组或事件"):
        Dao.from_dict(raw)


def test_narrative_rejects_unknown_observer() -> None:
    raw = _raw()
    raw["narrative"]["outline"]["observer"] = "missing"

    with pytest.raises(KeyError, match="observer moai"):
        Dao.from_dict(raw)


def test_nested_narrative_is_still_supported() -> None:
    raw = _raw()
    raw["drift"]["narrative"] = raw.pop("narrative")

    dao = Dao.from_dict(raw)

    assert dao.narrative["outline"].observer == "observer"
    assert "narrative" not in dao.drift
