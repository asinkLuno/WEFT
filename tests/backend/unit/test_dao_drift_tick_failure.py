"""Spec 8: Drift.from_dict 的 tick 失败兜底分支。

当 aqueduct 的 ``to_tick`` 抛非 ``NotImplementedError`` 异常（用户插件 bug）时，
``Drift.from_dict`` 把它包成 ``PluginError AQUEDUCT_CALCULATION_FAILED``，
``details`` 钉死 ``exception_type`` 与 ``reason``，``__cause__`` 链到原异常。
与 Spec 7 一致：仅 ``end_time`` 已设时触发；``end_time=None`` 时延后暴露。
"""

from __future__ import annotations

import pytest

from weft_backend.aqueduct import Aqueduct, Brick
from weft_backend.dao import Drift
from weft_backend.errors import PluginError


def _broken_aqueduct(exc_factory) -> Aqueduct:
    def _to_tick(values):
        raise exc_factory()

    return Aqueduct(
        [Brick("日", get_limit=lambda ctx: 31)],
        to_tick=_to_tick,
    )


@pytest.mark.unit
class TestDriftTickFailure:
    def test_value_error_wrapped_as_calculation_failed(self):
        aq = _broken_aqueduct(lambda: ValueError("calendar bug"))
        with pytest.raises(PluginError) as exc_info:
            Drift.from_dict(
                group="g",
                title="t",
                data={"start_time": [1], "end_time": [2]},
                moais={},
                aqueduct=aq,
            )
        err = exc_info.value
        assert err.code == "AQUEDUCT_CALCULATION_FAILED"
        assert err.path == ("drift", "g", "t", "start_time")
        assert err.details["exception_type"] == "ValueError"
        assert err.details["reason"] == "calendar bug"
        # message 含 drift.id（"{group}/{title}"）方便日志定位。
        assert "g/t" in err.message
        # 原始异常通过 __cause__ 链上，traceback 不丢。
        assert isinstance(err.__cause__, ValueError)

    def test_runtime_error_wrapped_as_calculation_failed(self):
        aq = _broken_aqueduct(lambda: RuntimeError("universe collapsed"))
        with pytest.raises(PluginError) as exc_info:
            Drift.from_dict(
                group="g",
                title="t",
                data={"start_time": [1], "end_time": [2]},
                moais={},
                aqueduct=aq,
            )
        assert exc_info.value.code == "AQUEDUCT_CALCULATION_FAILED"
        assert exc_info.value.details["exception_type"] == "RuntimeError"

    def test_end_time_omitted_defers_failure_to_access(self):
        # 与 Spec 7 对称：end_time=None 时不在 from_dict 抛；cached_property 延后。
        aq = _broken_aqueduct(lambda: ValueError("later"))
        drift = Drift.from_dict(
            group="g",
            title="t",
            data={"start_time": [1]},
            moais={},
            aqueduct=aq,
        )
        # from_dict 通过；访问 start_tick 才看到原始 ValueError。
        with pytest.raises(ValueError):
            drift.start_tick
