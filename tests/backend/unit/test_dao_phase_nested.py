"""Spec 2: _phase 解析 ``[base..., ref_time]`` 嵌套形式。

当时间列表末尾是 list 时，它被解释为该相位所相对的 ``ref_time``；前导 int
是 ``base_time``。``ref_time`` 本身递归走 _phase，所以可以多层嵌套。
"""

from __future__ import annotations

import pytest

from weft_backend.aqueduct import gregorian_aqueduct
from weft_backend.dao import _phase


@pytest.mark.unit
class TestPhaseNestedRefTime:
    def test_short_base_with_short_ref(self):
        # base=[2024]（补零到 6），ref=[0,1,0]（补零到 6）。
        phase = _phase([2024, [0, 1, 0]], gregorian_aqueduct)
        assert phase.base_time == [2024, 0, 0, 0, 0, 0]
        assert phase.ref_time is not None
        assert phase.ref_time.base_time == [0, 1, 0, 0, 0, 0]
        assert phase.ref_time.ref_time is None

    def test_full_base_with_full_ref(self):
        # base 与 ref 都满 6 位。
        phase = _phase(
            [2024, 1, 1, 0, 0, 0, [0, 0, 0, 12, 0, 0]],
            gregorian_aqueduct,
        )
        assert phase.base_time == [2024, 1, 1, 0, 0, 0]
        assert phase.ref_time is not None
        assert phase.ref_time.base_time == [0, 0, 0, 12, 0, 0]


@pytest.mark.unit
class TestPhaseRecursiveNested:
    def test_three_level_chain(self):
        # 多层嵌套：外 base=[1]，中 base=[0,1]（作为外的 ref），内 base=[0,0,1]（作为中的 ref）。
        phase = _phase([1, [0, 1, [0, 0, 1]]], gregorian_aqueduct)
        assert phase.base_time == [1, 0, 0, 0, 0, 0]

        middle = phase.ref_time
        assert middle is not None
        assert middle.base_time == [0, 1, 0, 0, 0, 0]

        inner = middle.ref_time
        assert inner is not None
        assert inner.base_time == [0, 0, 1, 0, 0, 0]
        assert inner.ref_time is None


@pytest.mark.unit
class TestPhaseBaseOnlyRef:
    def test_empty_base_with_ref_only(self):
        # 数据形状 ``[[...]]``：base 为空，全部从 ref_time 出。
        # base 补零到 brick 数，ref_time 递归。
        phase = _phase([[0, 1, 0]], gregorian_aqueduct)
        assert phase.base_time == [0, 0, 0, 0, 0, 0]
        assert phase.ref_time is not None
        assert phase.ref_time.base_time == [0, 1, 0, 0, 0, 0]
