"""Spec 7: Narrative observer 必须在所有被引用 drift 的 ``moais`` 里。

narrative 是「观察者视角下的故事」——observer 必须在每个被引用 drift 的
``moais`` 列表里。任一缺席都抛 ``ReferenceError NARRATIVE_OBSERVER_ABSENT``，
``details["drift_ids"]`` 收集**全部**缺席的 drift ID（按 narrative_drifts 顺序），
方便 UI 高亮所有问题事件。
"""

from __future__ import annotations

import pytest

from weft_backend.aqueduct import Phase, gregorian_aqueduct
from weft_backend.dao import Drift, Moai, Narrative
from weft_backend.errors import ReferenceError


def _drift(group: str, title: str, day: int, observers: list[str]) -> Drift:
    return Drift(
        id=f"{group}/{title}",
        title=title,
        start_time=Phase(base_time=[2024, 1, day, 0, 0, 0]),
        aqueduct=gregorian_aqueduct,
        moais=observers,
    )


def _registry(*names: str) -> dict:
    return {
        name: Moai.from_dict(name, {"description": "D"}, gregorian_aqueduct)
        for name in names
    }


@pytest.mark.unit
class TestNarrativeObserverAbsent:
    def test_single_absence_raises_with_all_missing_ids(self):
        drifts = {
            "season": [
                _drift("season", "present", 1, ["guojing"]),
                _drift("season", "absent", 2, ["other_moai"]),
            ],
        }
        with pytest.raises(ReferenceError) as exc_info:
            Narrative.from_dict(
                data={"subject": ["season"], "observer": "guojing"},
                drifts=drifts,
                moais=_registry("guojing", "other_moai"),
            )
        err = exc_info.value
        assert err.code == "NARRATIVE_OBSERVER_ABSENT"
        assert err.details["observer"] == "guojing"
        assert err.details["drift_ids"] == ["season/absent"]

    def test_multiple_absences_collected_in_order(self):
        # 多个缺席：drift_ids 按 narrative_drifts 顺序记录全部。
        drifts = {
            "season": [
                _drift("season", "a", 1, ["other"]),
                _drift("season", "b", 2, ["guojing"]),
                _drift("season", "c", 3, ["other"]),
            ],
        }
        with pytest.raises(ReferenceError) as exc_info:
            Narrative.from_dict(
                data={"subject": ["season"], "observer": "guojing"},
                drifts=drifts,
                moais=_registry("guojing", "other"),
            )
        assert exc_info.value.details["drift_ids"] == ["season/a", "season/c"]

    def test_drift_with_none_moais_counts_as_absent(self):
        # ``observer not in (None or ())`` == ``observer not in ()`` == True；
        # 没声明参与者的 drift 视作全员缺席。
        drift_no_moais = Drift(
            id="season/solo",
            title="solo",
            start_time=Phase(base_time=[2024, 1, 1, 0, 0, 0]),
            aqueduct=gregorian_aqueduct,
            moais=None,
        )
        drifts = {"season": [drift_no_moais]}
        with pytest.raises(ReferenceError) as exc_info:
            Narrative.from_dict(
                data={"subject": ["season"], "observer": "guojing"},
                drifts=drifts,
                moais=_registry("guojing"),
            )
        assert exc_info.value.details["drift_ids"] == ["season/solo"]

    def test_no_absence_does_not_raise(self):
        # 对照样：observer 在每个 drift.moais 里，不抛。
        drifts = {
            "season": [
                _drift("season", "a", 1, ["guojing"]),
                _drift("season", "b", 2, ["guojing", "other"]),
            ],
        }
        narrative = Narrative.from_dict(
            data={"subject": ["season"], "observer": "guojing"},
            drifts=drifts,
            moais=_registry("guojing", "other"),
        )
        assert len(narrative.drifts) == 2
