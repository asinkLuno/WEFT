"""Spec 8: Aqueduct.de_recursive 展开 Phase.ref_time 链。

``Phase`` 把一个时间点拆成 ``base_time`` 与 ``ref_time``：后者可以 ``None``、
原始 list[int]、或下一个 Phase。``de_recursive`` 沿链路 ``plus`` 累加，直到
``ref_time`` 为 ``None`` 或落到原始 list（终止遍历）。
"""

from __future__ import annotations

import pytest

from weft_backend.aqueduct import Aqueduct, gregorian_aqueduct
from weft_backend.aqueduct import Phase


@pytest.mark.unit
class TestDeRecursive:
    def test_no_ref_time_returns_base_unchanged(self):
        # 链尾：ref_time=None，直接返回 base_time。
        phase = Phase(base_time=[2024, 1, 1, 0, 0, 0])
        assert gregorian_aqueduct.de_recursive(phase) == [2024, 1, 1, 0, 0, 0]

    def test_ref_time_as_raw_list_terminates_walk(self):
        # ref_time 是 list[int]：累加后停止，不再继续下探。
        phase = Phase(base_time=[2024, 1, 1, 0, 0, 0], ref_time=[0, 0, 0, 12, 0, 0])
        assert gregorian_aqueduct.de_recursive(phase) == [2024, 1, 1, 12, 0, 0]

    def test_single_level_phase_ref(self):
        # ref_time 是 Phase，但没有再下一层。
        inner = Phase(base_time=[0, 1, 0, 0, 0, 0])
        outer = Phase(base_time=[1, 0, 0, 0, 0, 0], ref_time=inner)
        assert gregorian_aqueduct.de_recursive(outer) == [1, 1, 0, 0, 0, 0]

    def test_two_level_phase_chain(self):
        # 三层叠加：外 base=1年，中 base=1月（无 ref），内 base=1日（作为 ref）。
        inner = Phase(base_time=[0, 0, 1, 0, 0, 0])
        middle = Phase(base_time=[0, 1, 0, 0, 0, 0], ref_time=inner)
        outer = Phase(base_time=[1, 0, 0, 0, 0, 0], ref_time=middle)
        assert gregorian_aqueduct.de_recursive(outer) == [1, 1, 1, 0, 0, 0]

    def test_phase_chain_terminates_with_raw_list(self):
        # 内层 Phase 的 ref_time 是 list：累加 list 后停。
        inner = Phase(base_time=[0, 0, 1, 0, 0, 0], ref_time=[0, 0, 0, 12, 0, 0])
        outer = Phase(base_time=[1, 0, 0, 0, 0, 0], ref_time=inner)
        assert gregorian_aqueduct.de_recursive(outer) == [1, 0, 1, 12, 0, 0]

    def test_chain_does_not_normalize_intermediate_sums(self):
        # de_recursive 只用 plus（按位加），中间和可能越界（13 月）；
        # normalize 是调用方的责任。用 13 月的中间和钉死这一点。
        inner = Phase(base_time=[0, 7, 0, 0, 0, 0])
        outer = Phase(base_time=[1, 6, 0, 0, 0, 0], ref_time=inner)
        # 1 年 6 月 + 0 年 7 月 = 1 年 13 月（不规整）。
        assert gregorian_aqueduct.de_recursive(outer) == [1, 13, 0, 0, 0, 0]
