"""Spec 5: Narrative.from_dict subject 必须能解析成 drift 分组或事件 ID。

subject 的每个元素先在 drift 分组字典里查，再在 drift ID 字典里查；都查不
到时抛 ``ReferenceError NARRATIVE_SUBJECT_NOT_FOUND``，``details["subject"]``
钉死原引用。
"""

from __future__ import annotations

import pytest

from weft_backend.aqueduct import Phase, gregorian_aqueduct
from weft_backend.dao import Drift, Moai, Narrative
from weft_backend.errors import ReferenceError


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
class TestNarrativeSubjectNotFound:
    def test_unknown_group_raises(self):
        drifts = {"real": [_drift("real", "a", 1, "guojing")]}
        with pytest.raises(ReferenceError) as exc_info:
            Narrative.from_dict(
                data={"subject": ["ghost"], "observer": "guojing"},
                drifts=drifts,
                moais=_registry("guojing"),
            )
        err = exc_info.value
        assert err.code == "NARRATIVE_SUBJECT_NOT_FOUND"
        assert err.path == ("narrative", "subject")
        assert err.details == {"subject": "ghost"}

    def test_unknown_drift_id_format_raises(self):
        # drift.id 形如 "group/title"；写错分组部分应抛。
        drifts = {"real": [_drift("real", "a", 1, "guojing")]}
        with pytest.raises(ReferenceError) as exc_info:
            Narrative.from_dict(
                data={"subject": ["real/ghost"], "observer": "guojing"},
                drifts=drifts,
                moais=_registry("guojing"),
            )
        assert exc_info.value.details == {"subject": "real/ghost"}

    def test_first_unknown_in_subject_wins(self):
        # 多个未知引用时按顺序触发第一个。
        drifts = {}
        with pytest.raises(ReferenceError) as exc_info:
            Narrative.from_dict(
                data={"subject": ["ghost1", "ghost2"], "observer": "guojing"},
                drifts=drifts,
                moais=_registry("guojing"),
            )
        assert exc_info.value.details == {"subject": "ghost1"}

    def test_empty_drifts_registry_rejects_any_subject(self):
        # 边界：drifts={} 时所有 subject 引用都是 unknown。
        with pytest.raises(ReferenceError):
            Narrative.from_dict(
                data={"subject": ["anything"], "observer": "guojing"},
                drifts={},
                moais=_registry("guojing"),
            )
