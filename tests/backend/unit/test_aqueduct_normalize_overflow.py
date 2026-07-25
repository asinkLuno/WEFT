"""Spec 2a: Aqueduct.normalize 处理严格越界（v > limit）与负数借位。

边界 ``v == limit`` 由 ``test_aqueduct_normalize_boundary.py`` 覆盖；本文件
只钉严格越界行为：月/日/时/分/秒多走一位就向高位进 1，缺额时向高位借 1。
"""

from __future__ import annotations

import pytest

from weft_backend.aqueduct import gregorian_aqueduct


@pytest.mark.unit
class TestNormalizeOverflow:
    def test_month_13_carries_to_next_year_january(self):
        # 13 月严格越界（>12），进位到次年 1 月。
        assert gregorian_aqueduct.normalize([2024, 13, 1, 0, 0, 0]) == [
            2025,
            1,
            1,
            0,
            0,
            0,
        ]

    def test_month_14_carries_to_next_year_february(self):
        # 14 月 = 1 年 2 月。
        assert gregorian_aqueduct.normalize([2024, 14, 1, 0, 0, 0]) == [
            2025,
            2,
            1,
            0,
            0,
            0,
        ]

    def test_month_25_carries_two_years(self):
        # 25 月 = 2 年 1 月。
        assert gregorian_aqueduct.normalize([2024, 25, 1, 0, 0, 0]) == [
            2026,
            1,
            1,
            0,
            0,
            0,
        ]

    def test_january_32nd_carries_to_february_1(self):
        # 1 月有 31 天；32 日 → 2 月 1 日。
        assert gregorian_aqueduct.normalize([2024, 1, 32, 0, 0, 0]) == [
            2024,
            2,
            1,
            0,
            0,
            0,
        ]

    def test_february_30_in_leap_year_carries_to_march_1(self):
        # 2024 是闰年，2 月有 29 天；30 日 → 3 月 1 日。
        assert gregorian_aqueduct.normalize([2024, 2, 30, 0, 0, 0]) == [
            2024,
            3,
            1,
            0,
            0,
            0,
        ]

    def test_second_65_carries_to_minute_1(self):
        # 65 秒 = 1 分 5 秒。
        assert gregorian_aqueduct.normalize([2024, 1, 1, 0, 0, 65]) == [
            2024,
            1,
            1,
            0,
            1,
            5,
        ]

    def test_hour_25_carries_to_next_day_1am(self):
        # 25 时 = 次日 1 时。
        assert gregorian_aqueduct.normalize([2024, 1, 1, 25, 0, 0]) == [
            2024,
            1,
            2,
            1,
            0,
            0,
        ]


@pytest.mark.unit
class TestNormalizeBorrow:
    def test_second_minus_5_borrows_from_minute(self):
        # 秒 -5：从分位借 1，得 59 秒；分位变 -1，继续向高位借。
        assert gregorian_aqueduct.normalize([2024, 1, 1, 0, 0, -5]) == [
            2024,
            1,
            0,
            23,
            59,
            55,
        ]

    def test_minute_minus_1_borrows_from_hour(self):
        # 分 -1：从时位借 1，得 59 分；时位变 -1，继续向日位借。
        assert gregorian_aqueduct.normalize([2024, 1, 1, 0, -1, 0]) == [
            2024,
            1,
            0,
            23,
            59,
            0,
        ]
