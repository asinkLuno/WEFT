import pytest
from sys import maxsize

from src.core.aqueduct import Brick, Aqueduct, get_days_in_month, gregorian_bricks


class TestGetDaysInMonth:
    def test_31_day_months(self):
        for month in [1, 3, 5, 7, 8, 10, 12]:
            assert get_days_in_month({"年": 2024, "月": month}) == 31

    def test_30_day_months(self):
        for month in [4, 6, 9, 11]:
            assert get_days_in_month({"年": 2024, "月": month}) == 30

    def test_february_common_year(self):
        assert get_days_in_month({"年": 2023, "月": 2}) == 28

    def test_february_leap_year_divisible_by_4(self):
        assert get_days_in_month({"年": 2024, "月": 2}) == 29

    def test_february_leap_year_divisible_by_400(self):
        assert get_days_in_month({"年": 2000, "月": 2}) == 29

    def test_february_not_leap_year_divisible_by_100(self):
        assert get_days_in_month({"年": 1900, "月": 2}) == 28

    def test_invalid_month_raises(self):
        with pytest.raises(ValueError, match="非法的月份"):
            get_days_in_month({"年": 2024, "月": 13})


class TestBrick:
    def test_brick_name(self):
        b = Brick("年", get_limit=lambda ctx: maxsize)
        assert b.name == "年"

    def test_brick_get_limit(self):
        b = Brick("月", get_limit=lambda ctx: 12)
        assert b.get_limit({}) == 12

    def test_brick_get_limit_receives_context(self):
        b = Brick("日", get_limit=get_days_in_month)
        assert b.get_limit({"年": 2024, "月": 1}) == 31


class TestAqueductNormalize:
    def test_empty_bricks(self):
        aq = Aqueduct([])
        assert aq.normalize([]) == []

    def test_single_brick(self):
        b = Brick("x", get_limit=lambda ctx: 10)
        aq = Aqueduct([b])
        # reversed(["x"]) → ["x"]; i=0,n="x": v=5+0=5, c=10
        assert aq.normalize([5]) == [5]

    def test_two_bricks_carry_flow(self):
        b0 = Brick("a", get_limit=lambda ctx: 10)
        b1 = Brick("b", get_limit=lambda ctx: 2)
        aq = Aqueduct([b0, b1])
        # names=["a","b"], reversed=["b","a"]
        # i=0,n="b": v=8+0=8, c=b0.limit=10
        # i=1,n="a": v=3+10=13, c=b1.limit=2
        assert aq.normalize([3, 8]) == [8, 13]

    def test_gregorian_no_overflow(self):
        aq = Aqueduct(gregorian_bricks)
        result = aq.normalize([2024, 1, 15, 10, 30, 45])
        # reversed: 秒,分,时,日,月,年
        # i=0,n="秒": v=45+0=45, c=年.limit=maxsize
        # i=1,n="分": v=30+maxsize=30+maxsize, c=月.limit=12
        # i=2,n="时": v=10+12=22, c=日.limit=31
        # i=3,n="日": v=15+31=46, c=时.limit=24
        # i=4,n="月": v=1+24=25, c=分.limit=60
        # i=5,n="年": v=2024+60=2084, c=秒.limit=60
        assert result == [45, 30 + maxsize, 22, 46, 25, 2084]

    def test_gregorian_february_leap_year(self):
        aq = Aqueduct(gregorian_bricks)
        result = aq.normalize([2024, 2, 28, 0, 0, 0])
        # i=0,n="秒": v=0+0=0, c=maxsize
        # i=1,n="分": v=0+maxsize=maxsize, c=12
        # i=2,n="时": v=0+12=12, c=29 (Feb 2024 is leap)
        # i=3,n="日": v=28+29=57, c=24
        # i=4,n="月": v=2+24=26, c=60
        # i=5,n="年": v=2024+60=2084, c=60
        assert result == [0, maxsize, 12, 57, 26, 2084]

    def test_gregorian_december(self):
        aq = Aqueduct(gregorian_bricks)
        result = aq.normalize([2023, 12, 31, 23, 59, 59])
        # i=0,n="秒": v=59+0=59, c=maxsize
        # i=1,n="分": v=59+maxsize=maxsize+59, c=12
        # i=2,n="时": v=23+12=35, c=31
        # i=3,n="日": v=31+31=62, c=24
        # i=4,n="月": v=12+24=36, c=60
        # i=5,n="年": v=2023+60=2083, c=60
        assert result == [59, 59 + maxsize, 35, 62, 36, 2083]

    def test_result_order_is_reversed(self):
        """normalize returns values in reverse name order (seconds first)."""
        b0 = Brick("x", get_limit=lambda ctx: 5)
        b1 = Brick("y", get_limit=lambda ctx: 7)
        aq = Aqueduct([b0, b1])
        result = aq.normalize([1, 2])
        # reversed: y,x → result order: [y_related, x_related]
        # result[0] comes from "y" value, result[1] from "x" value
        # i=0,n="y": v=2+0=2, c=b0.limit=5
        # i=1,n="x": v=1+5=6, c=b1.limit=7
        assert result == [2, 6]

    def test_custom_bricks_all_equal_limits(self):
        bricks = [
            Brick("h", get_limit=lambda ctx: 24),
            Brick("m", get_limit=lambda ctx: 60),
            Brick("s", get_limit=lambda ctx: 60),
        ]
        aq = Aqueduct(bricks)
        # reversed: s, m, h
        # i=0,n="s": v=0+0=0, c=h.limit=24
        # i=1,n="m": v=0+24=24, c=m.limit=60
        # i=2,n="h": v=10+60=70, c=s.limit=60
        result = aq.normalize([10, 0, 0])
        assert result == [0, 24, 70]
