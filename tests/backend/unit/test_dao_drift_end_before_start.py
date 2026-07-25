"""Spec 6: Drift.from_dict end_time 严格早于 start_time 时抛 TimelineError。

``end_tick < start_tick``（严格小于）触发 ``DRIFT_END_BEFORE_START``。
边界：``end_tick == start_tick`` 不触发（同 tick 视作零长度事件，合法）。
``end_time=None`` 时 ``end_tick`` 为 None，也不触发。
"""

from __future__ import annotations

import pytest

from weft_backend.aqueduct import gregorian_aqueduct
from weft_backend.dao import Drift
from weft_backend.errors import TimelineError


@pytest.mark.unit
class TestDriftEndBeforeStart:
    def test_end_strictly_before_start_raises(self):
        with pytest.raises(TimelineError) as exc_info:
            Drift.from_dict(
                group="g",
                title="t",
                data={"start_time": [2024, 1, 2], "end_time": [2024, 1, 1]},
                moais={},
                aqueduct=gregorian_aqueduct,
            )
        err = exc_info.value
        assert err.code == "DRIFT_END_BEFORE_START"
        assert err.path == ("drift", "g", "t", "end_time")
        assert err.details == {"drift_id": "g/t"}

    def test_end_equal_to_start_does_not_raise(self):
        # 边界：end_tick == start_tick 视作零长度事件，合法。
        drift = Drift.from_dict(
            group="g",
            title="t",
            data={"start_time": [2024, 1, 1], "end_time": [2024, 1, 1]},
            moais={},
            aqueduct=gregorian_aqueduct,
        )
        assert drift.end_tick == drift.start_tick

    def test_end_after_start_does_not_raise(self):
        drift = Drift.from_dict(
            group="g",
            title="t",
            data={"start_time": [2024, 1, 1], "end_time": [2024, 1, 2]},
            moais={},
            aqueduct=gregorian_aqueduct,
        )
        assert drift.end_tick is not None and drift.end_tick > drift.start_tick

    def test_end_time_omitted_does_not_raise(self):
        # 没有 end_time → end_tick 为 None → 校验分支跳过。
        drift = Drift.from_dict(
            group="g",
            title="t",
            data={"start_time": [2024, 1, 1]},
            moais={},
            aqueduct=gregorian_aqueduct,
        )
        assert drift.end_tick is None
