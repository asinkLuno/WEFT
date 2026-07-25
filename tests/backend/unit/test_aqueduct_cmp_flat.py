"""Spec 10: Aqueduct.cmp_flat 字典序比较。

``cmp_flat`` 不调 ``validate_time_unit``——它只做逐位字典序比较，调用方负责
保证传入已规整的等长列表。本文件钉死 -1/0/1 三类返回、不同分量的优先级、
以及长度不匹配时由 ``zip(strict=True)`` 抛 ``ValueError`` 的契约。
"""

from __future__ import annotations

import pytest

from weft_backend.aqueduct import gregorian_aqueduct


@pytest.mark.unit
class TestCmpFlat:
    def test_year_decides_when_year_differs(self):
        # 年位决定：2025 > 2024。
        assert gregorian_aqueduct.cmp_flat([2025, 1, 1, 0, 0, 0], [2024, 12, 31, 23, 59, 59]) == 1

    def test_month_decides_when_year_equal(self):
        # 年位相等、月位 12 > 1。
        assert gregorian_aqueduct.cmp_flat([2024, 12, 1, 0, 0, 0], [2024, 1, 31, 23, 59, 59]) == 1

    def test_last_component_decides(self):
        # 前 5 位全等，秒位 1 > 0。
        assert gregorian_aqueduct.cmp_flat([2024, 1, 1, 0, 0, 1], [2024, 1, 1, 0, 0, 0]) == 1
        assert gregorian_aqueduct.cmp_flat([2024, 1, 1, 0, 0, 0], [2024, 1, 1, 0, 0, 1]) == -1

    def test_equal_lists_return_zero(self):
        assert gregorian_aqueduct.cmp_flat([2024, 1, 1, 0, 0, 0], [2024, 1, 1, 0, 0, 0]) == 0

    def test_unequal_length_raises_value_error(self):
        # zip(strict=True)：长度不等直接 ValueError，不静默截断。
        with pytest.raises(ValueError):
            gregorian_aqueduct.cmp_flat([1, 2, 3], [1, 2])
