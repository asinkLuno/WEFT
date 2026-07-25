"""Spec 4: get_days_in_month 的闰年与月份长度规则。

闰年判定按公历标准：被 4 整除且不被 100 整除，或被 400 整除。月份长度按
1/3/5/7/8/10/12 = 31，4/6/9/11 = 30，2 月随闰年切换。``月=0`` 是偏移量
型时间的哨兵，返回 ``maxsize`` 让 normalize 跳过该位。
"""

from __future__ import annotations

from sys import maxsize

import pytest

from weft_backend.aqueduct import get_days_in_month


@pytest.mark.unit
class TestGetDaysInMonth:
    def test_long_months_have_31_days(self):
        for month in (1, 3, 5, 7, 8, 10, 12):
            assert get_days_in_month({"年": 2024, "月": month}) == 31

    def test_short_months_have_30_days(self):
        for month in (4, 6, 9, 11):
            assert get_days_in_month({"年": 2024, "月": month}) == 30


@pytest.mark.unit
class TestFebruaryLeapYear:
    def test_century_divisible_by_400_is_leap(self):
        # 2000 被 400 整除 → 闰年 → 29 天。
        assert get_days_in_month({"年": 2000, "月": 2}) == 29

    def test_century_divisible_by_100_only_is_not_leap(self):
        # 1900 被 100 整除但不被 400 整除 → 平年 → 28 天。
        assert get_days_in_month({"年": 1900, "月": 2}) == 28

    def test_year_divisible_by_4_is_leap(self):
        # 2024 被 4 整除、不被 100 整除 → 闰年 → 29 天。
        assert get_days_in_month({"年": 2024, "月": 2}) == 29

    def test_year_not_divisible_by_4_is_not_leap(self):
        # 2023 不被 4 整除 → 平年 → 28 天。
        assert get_days_in_month({"年": 2023, "月": 2}) == 28


@pytest.mark.unit
class TestFebruaryEdgeCentury:
    def test_year_zero_is_leap(self):
        # 天文年编号里 0 年等价于公元前 1 年；0 被 400 整除 → 闰年。
        assert get_days_in_month({"年": 0, "月": 2}) == 29

    def test_negative_year_divisible_by_400_is_leap(self):
        # Python 的 % 对负数仍返回非负余数；-400 % 400 == 0 → 视作闰年。
        assert get_days_in_month({"年": -400, "月": 2}) == 29

    def test_negative_year_not_divisible_by_4_is_not_leap(self):
        assert get_days_in_month({"年": -1, "月": 2}) == 28


@pytest.mark.unit
class TestNoMonthSentinel:
    def test_month_zero_returns_maxsize(self):
        # 月=0 是偏移量型时间的哨兵；返回 maxsize 让 normalize 跳过日位借位
        # （见 ponytail）。任何月份编号兜底也走这条路径。
        assert get_days_in_month({"年": 2024, "月": 0}) == maxsize
