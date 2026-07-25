"""Spec 1: Narrative.from_dict 快乐路径。

subject 元素引用 drift 分组（值是 list[Drift]）；observer 必须在每个被引用
drift 的 ``moais`` 里。返回的 ``drifts`` 是源 drift 的深拷贝——后续 mutate
narrative 不应污染原始 drift 注册表。
"""

from __future__ import annotations

import pytest

from weft_backend.aqueduct import Phase, gregorian_aqueduct
from weft_backend.dao import Drift, Moai, Narrative


def _drift(group: str, title: str, day: int, observer: str) -> Drift:
    return Drift(
        id=f"{group}/{title}",
        title=title,
        start_time=Phase(base_time=[2024, 1, day, 0, 0, 0]),
        aqueduct=gregorian_aqueduct,
        moais=[observer],
    )


def _registry(*names: str) -> dict:
    return {
        name: Moai.from_dict(name, {"description": "D"}, gregorian_aqueduct)
        for name in names
    }


@pytest.mark.unit
class TestNarrativeHappy:
    def test_subject_resolves_to_group_drifts(self):
        drifts = {
            "season": [
                _drift("season", "a", 1, "guojing"),
                _drift("season", "b", 2, "guojing"),
            ],
        }
        narrative = Narrative.from_dict(
            data={"subject": ["season"], "observer": "guojing"},
            drifts=drifts,
            moais=_registry("guojing"),
        )
        assert narrative.subject == ["season"]
        assert narrative.observer == "guojing"
        # subject 引用分组时，分组内所有 drift 都进 narrative。
        assert len(narrative.drifts) == 2
        assert {d.id for d in narrative.drifts} == {"season/a", "season/b"}

    def test_drifts_are_deep_copied(self):
        # narrative.drifts 里的实例应不是源 drift 实例；mutate 不污染源。
        source_drift = _drift("season", "a", 1, "guojing")
        drifts = {"season": [source_drift]}
        narrative = Narrative.from_dict(
            data={"subject": ["season"], "observer": "guojing"},
            drifts=drifts,
            moais=_registry("guojing"),
        )
        assert narrative.drifts[0] is not source_drift
        # mutate narrative copy；源保持原值。
        narrative.drifts[0].title = "mutated"
        assert source_drift.title == "a"

    def test_multiple_subjects_flatten_into_drifts(self):
        # subject 是多分组列表；结果按 subject 顺序拼接。
        drifts = {
            "season_1": [_drift("season_1", "a", 1, "guojing")],
            "season_2": [_drift("season_2", "b", 2, "guojing")],
        }
        narrative = Narrative.from_dict(
            data={"subject": ["season_1", "season_2"], "observer": "guojing"},
            drifts=drifts,
            moais=_registry("guojing"),
        )
        assert [d.id for d in narrative.drifts] == ["season_1/a", "season_2/b"]
