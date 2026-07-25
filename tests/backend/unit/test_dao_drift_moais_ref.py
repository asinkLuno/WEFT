"""Spec 4: Drift.from_dict 引用未注册 moai 抛 ReferenceError。

每个 moai 名必须在传入的 ``moais`` 注册表里。第一个缺失名触发
``DRIFT_MOAI_NOT_FOUND``，``details["moai"]`` 钉死原名称方便 UI 高亮。
"""

from __future__ import annotations

import pytest

from weft_backend.aqueduct import gregorian_aqueduct
from weft_backend.dao import Drift, Moai
from weft_backend.errors import ReferenceError


def _moai_registry(*names: str) -> dict:
    return {
        name: Moai.from_dict(name, {"description": "D"}, gregorian_aqueduct)
        for name in names
    }


@pytest.mark.unit
class TestDriftMoaiNotFound:
    def test_single_missing_moai_raises(self):
        with pytest.raises(ReferenceError) as exc_info:
            Drift.from_dict(
                group="g",
                title="t",
                data={"start_time": [2024], "moais": ["ghost"]},
                moais=_moai_registry("real"),
                aqueduct=gregorian_aqueduct,
            )
        err = exc_info.value
        assert err.code == "DRIFT_MOAI_NOT_FOUND"
        assert err.path == ("drift", "g", "t", "moais")
        assert err.details == {"moai": "ghost"}

    def test_first_missing_moai_wins(self):
        # 多个缺失名时，按列表顺序第一个触发； details 钉死该名。
        with pytest.raises(ReferenceError) as exc_info:
            Drift.from_dict(
                group="g",
                title="t",
                data={"start_time": [2024], "moais": ["ghost1", "ghost2"]},
                moais={},
                aqueduct=gregorian_aqueduct,
            )
        assert exc_info.value.details == {"moai": "ghost1"}

    def test_partial_missing_raises(self):
        # 部分存在、部分缺失：仍按列表顺序触发第一个缺失名。
        with pytest.raises(ReferenceError) as exc_info:
            Drift.from_dict(
                group="g",
                title="t",
                data={"start_time": [2024], "moais": ["real", "ghost"]},
                moais=_moai_registry("real"),
                aqueduct=gregorian_aqueduct,
            )
        assert exc_info.value.details == {"moai": "ghost"}

    def test_all_present_does_not_raise(self):
        # 对照样：全部存在时不抛 ReferenceError（快乐路径在 Spec 1 覆盖，这里再钉一次）。
        drift = Drift.from_dict(
            group="g",
            title="t",
            data={"start_time": [2024], "moais": ["a", "b"]},
            moais=_moai_registry("a", "b"),
            aqueduct=gregorian_aqueduct,
        )
        assert drift.moais == ["a", "b"]
