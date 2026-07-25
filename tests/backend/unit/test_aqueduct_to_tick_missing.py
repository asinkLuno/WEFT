"""Spec 9: Aqueduct.to_tick 在无转换器时抛 NotImplementedError。

部分 Aqueduct 只声明 brick 与进位规则（如自定义的偏移型日历），不需要
``to_tick``。``to_tick`` / ``distance`` 在这个配置下应抛带固定文案的
``NotImplementedError``，而不是悄悄回退到某个默认实现。
"""

from __future__ import annotations

import pytest

from weft_backend.aqueduct import Aqueduct, Brick


def _minimal_aqueduct() -> Aqueduct:
    # 1 个 brick 就够触发 validate_time_unit；不传 to_tick 即缺转换器。
    return Aqueduct(
        [Brick("日", get_limit=lambda ctx: 31)],
    )


@pytest.mark.unit
class TestToTickMissingConverter:
    def test_to_tick_raises_not_implemented(self):
        aq = _minimal_aqueduct()
        with pytest.raises(NotImplementedError, match="does not define a tick conversion"):
            aq.to_tick([1])

    def test_distance_raises_not_implemented_via_to_tick(self):
        # distance(start, end) 内部调 to_tick；缺转换器时同样抛 NotImplementedError。
        aq = _minimal_aqueduct()
        with pytest.raises(NotImplementedError):
            aq.distance([1], [2])

    def test_other_methods_still_work_without_to_tick(self):
        # 缺 to_tick 不该影响 normalize / humanize / plus 等不依赖 tick 的方法。
        aq = _minimal_aqueduct()
        assert aq.plus([1], [2]) == [3]
        assert aq.normalize([1]) == [1]
        assert aq.humanize([1]) == "1日"
