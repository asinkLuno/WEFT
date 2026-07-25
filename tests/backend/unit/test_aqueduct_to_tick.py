"""Spec 5: gregorian_to_tick 的相邻日差为 86400。

Hinnant 算法本身返回的是 ``days * 86400 + seconds_in_day``；起点任意但
固定的天文年坐标。本文件钉死的是相对差，而不是绝对值：跨日、跨月、跨闰年
2 月 29 日、跨年的相邻日，tick 差都应该是 86400。同时钉死更小的单位
（1 时 = 3600，1 分 = 60，1 秒 = 1）。
"""

from __future__ import annotations

import pytest

from weft_backend.aqueduct import gregorian_aqueduct, gregorian_to_tick


@pytest.mark.unit
class TestToTickGranularity:
    def test_one_second_equals_one_tick(self):
        assert (
            gregorian_to_tick([2024, 1, 1, 0, 0, 1])
            - gregorian_to_tick([2024, 1, 1, 0, 0, 0])
            == 1
        )

    def test_one_minute_equals_60_ticks(self):
        assert (
            gregorian_to_tick([2024, 1, 1, 0, 1, 0])
            - gregorian_to_tick([2024, 1, 1, 0, 0, 0])
            == 60
        )

    def test_one_hour_equals_3600_ticks(self):
        assert (
            gregorian_to_tick([2024, 1, 1, 1, 0, 0])
            - gregorian_to_tick([2024, 1, 1, 0, 0, 0])
            == 3600
        )


@pytest.mark.unit
class TestToTickConsecutiveDays:
    def test_same_month_consecutive_days(self):
        # 1 月 1 日 → 1 月 2 日：86400 ticks。
        assert (
            gregorian_to_tick([2024, 1, 2, 0, 0, 0])
            - gregorian_to_tick([2024, 1, 1, 0, 0, 0])
            == 86400
        )

    def test_cross_month_boundary_jan_to_feb(self):
        # 1 月 31 日 → 2 月 1 日：86400 ticks。
        assert (
            gregorian_to_tick([2024, 2, 1, 0, 0, 0])
            - gregorian_to_tick([2024, 1, 31, 0, 0, 0])
            == 86400
        )

    def test_cross_leap_year_feb_29(self):
        # 闰年 2 月：28→29 与 29→3 月 1 都该是 86400。
        assert (
            gregorian_to_tick([2024, 2, 29, 0, 0, 0])
            - gregorian_to_tick([2024, 2, 28, 0, 0, 0])
            == 86400
        )
        assert (
            gregorian_to_tick([2024, 3, 1, 0, 0, 0])
            - gregorian_to_tick([2024, 2, 29, 0, 0, 0])
            == 86400
        )

    def test_non_leap_year_feb_skips_to_march_1(self):
        # 平年 2 月只有 28 天；2 月 28 日 → 3 月 1 日 = 86400。
        assert (
            gregorian_to_tick([2023, 3, 1, 0, 0, 0])
            - gregorian_to_tick([2023, 2, 28, 0, 0, 0])
            == 86400
        )

    def test_cross_year_boundary(self):
        # 2024 年 12 月 31 日 → 2025 年 1 月 1 日：86400 ticks。
        assert (
            gregorian_to_tick([2025, 1, 1, 0, 0, 0])
            - gregorian_to_tick([2024, 12, 31, 0, 0, 0])
            == 86400
        )


@pytest.mark.unit
class TestDistance:
    def test_distance_returns_signed_difference(self):
        # Aqueduct.distance(start, end) = to_tick(end) - to_tick(start)。
        # 起点早于终点 → 正数。
        assert (
            gregorian_aqueduct.distance([2024, 1, 1, 0, 0, 0], [2024, 1, 2, 0, 0, 0])
            == 86400
        )
        # 起点晚于终点 → 负数。
        assert (
            gregorian_aqueduct.distance([2024, 1, 2, 0, 0, 0], [2024, 1, 1, 0, 0, 0])
            == -86400
        )

    def test_distance_zero_for_same_time(self):
        assert gregorian_aqueduct.distance([2024, 1, 1, 0, 0, 0], [2024, 1, 1, 0, 0, 0]) == 0
