"""Spec 5: Drift.from_dict 的 start_time 必填。

``"start_time" not in data`` 时抛 ``SchemaError DRIFT_START_REQUIRED``。注意：
显式 ``start_time: None`` 不触发本分支（会落到 _phase 的 TIME_NOT_LIST）；
这条边界也钉死，避免日后改成 ``data.get("start_time") is None`` 误吸。
"""

from __future__ import annotations

import pytest

from weft_backend.aqueduct import gregorian_aqueduct
from weft_backend.dao import Drift
from weft_backend.errors import SchemaError


@pytest.mark.unit
class TestDriftStartTimeRequired:
    def test_missing_start_time_raises_drift_start_required(self):
        with pytest.raises(SchemaError) as exc_info:
            Drift.from_dict(
                group="g",
                title="t",
                data={},
                moais={},
                aqueduct=gregorian_aqueduct,
            )
        err = exc_info.value
        assert err.code == "DRIFT_START_REQUIRED"
        assert err.path == ("drift", "g", "t", "start_time")

    def test_explicit_none_start_time_does_not_trigger_start_required(self):
        # ``"start_time" in data`` 为 True（值是 None）；守门跳过，进入 _phase，
        # _phase 把 None 视为非 list 抛 TIME_NOT_LIST。
        with pytest.raises(SchemaError) as exc_info:
            Drift.from_dict(
                group="g",
                title="t",
                data={"start_time": None},
                moais={},
                aqueduct=gregorian_aqueduct,
            )
        assert exc_info.value.code == "TIME_NOT_LIST"
        # _phase 收到的 path 仍是 ("drift", "g", "t", "start_time")。
        assert exc_info.value.path == ("drift", "g", "t", "start_time")

    def test_path_reflects_group_and_title(self):
        # 不同 group/title 应正确出现在 path 里。
        with pytest.raises(SchemaError) as exc_info:
            Drift.from_dict(
                group="season_42",
                title="final_battle",
                data={},
                moais={},
                aqueduct=gregorian_aqueduct,
            )
        assert exc_info.value.path == ("drift", "season_42", "final_battle", "start_time")
