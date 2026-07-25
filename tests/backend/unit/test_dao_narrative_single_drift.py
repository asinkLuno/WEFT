"""Spec 6: Narrative.from_dict subject 单事件解析。

当 subject 元素是 drift ID（``group/title`` 形式）而不是分组名时，只取那一个
drift 加入 ``narrative_drifts``。分组名与 drift ID 的解析顺序：先查分组，
找不到再查 ID 字典——这意味着真正撞名时分组胜出。
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
class TestNarrativeSingleDriftResolution:
    def test_subject_as_drift_id_yields_single_drift(self):
        drifts = {
            "season": [
                _drift("season", "a", 1, "guojing"),
                _drift("season", "b", 2, "guojing"),
            ],
        }
        # subject 写 "season/a"（drift ID 形式），不是分组名。
        narrative = Narrative.from_dict(
            data={"subject": ["season/a"], "observer": "guojing"},
            drifts=drifts,
            moais=_registry("guojing"),
        )
        assert len(narrative.drifts) == 1
        assert narrative.drifts[0].id == "season/a"

    def test_mix_group_and_individual_drift_id(self):
        # 混合：先取整组，再点名组内某个 drift；结果会重复（不去重）。
        drifts = {
            "season": [
                _drift("season", "a", 1, "guojing"),
                _drift("season", "b", 2, "guojing"),
            ],
        }
        narrative = Narrative.from_dict(
            data={"subject": ["season", "season/a"], "observer": "guojing"},
            drifts=drifts,
            moais=_registry("guojing"),
        )
        # 整组 2 个 + 单点 1 个 = 3 个；不去重是当前契约。
        assert [d.id for d in narrative.drifts] == ["season/a", "season/b", "season/a"]

    def test_single_drift_from_different_group(self):
        # 跨组单点：subject 同时引用两个不同组的 drift ID。
        drifts = {
            "g1": [_drift("g1", "a", 1, "guojing")],
            "g2": [_drift("g2", "b", 2, "guojing")],
        }
        narrative = Narrative.from_dict(
            data={"subject": ["g1/a", "g2/b"], "observer": "guojing"},
            drifts=drifts,
            moais=_registry("guojing"),
        )
        assert [d.id for d in narrative.drifts] == ["g1/a", "g2/b"]
