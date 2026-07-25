"""Spec 7: Drift.from_dict 的 tick 缺失分支。

当 aqueduct 没传 ``to_tick`` 时：
- ``end_time`` 已设 → ``from_dict`` 阶段立刻抛 ``PluginError AQUEDUCT_TICK_UNAVAILABLE``。
- ``end_time`` 缺省 → ``from_dict`` 通过；延后到访问 ``start_tick`` 时抛原始
  ``NotImplementedError``。

这条非对称契约值得钉死：drift 没有 end_time 视作「点事件」，不做 tick 计算；
有 end_time 视作「时段事件」，必须能算 tick 才能进 timeline。
"""

from __future__ import annotations

import pytest

from weft_backend.aqueduct import Aqueduct, Brick
from weft_backend.dao import Drift
from weft_backend.errors import PluginError


def _bare_aqueduct() -> Aqueduct:
    # 1 个 brick，没传 to_tick，触发 Aqueduct.to_tick 的默认 NotImplementedError。
    return Aqueduct([Brick("日", get_limit=lambda ctx: 31)])


@pytest.mark.unit
class TestDriftTickUnavailable:
    def test_end_time_set_triggers_aqueduct_tick_unavailable(self):
        aq = _bare_aqueduct()
        with pytest.raises(PluginError) as exc_info:
            Drift.from_dict(
                group="g",
                title="t",
                data={"start_time": [1], "end_time": [2]},
                moais={},
                aqueduct=aq,
            )
        err = exc_info.value
        assert err.code == "AQUEDUCT_TICK_UNAVAILABLE"
        assert err.path == ("drift", "g", "t", "start_time")
        assert err.hint == "在 Aqueduct 插件中提供 to_tick(values) 转换函数"
        # ``raise ... from exc`` —— 原始 NotImplementedError 链上。
        assert isinstance(err.__cause__, NotImplementedError)

    def test_end_time_omitted_defers_failure_to_access(self):
        # 非对称契约：end_time=None 时 from_dict 不抛，但访问 start_tick 仍爆。
        aq = _bare_aqueduct()
        drift = Drift.from_dict(
            group="g",
            title="t",
            data={"start_time": [1]},
            moais={},
            aqueduct=aq,
        )
        # from_dict 已通过；cached_property 在首次访问时才计算。
        with pytest.raises(NotImplementedError):
            drift.start_tick
