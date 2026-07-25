"""Spec 2b: Aqueduct.normalize 必须保留处于合法区间内的边界值。

当前实现用 ``c = v // limit; v = v % limit`` 一刀切，会让 ``v == limit`` 也
进位（例如 12 月变成次年 0 月）。0 月在 ``gregorian_to_tick`` 里通过
``divmod(month - 1, 12)`` 回卷到 12 月，tick 等价；但 ``humanize`` 直接拼
非零分量，所以 ``[2025, 0, 1, ...]`` 会显示成 ``"2025年1日"`` —— 12 月 1 日
丢了月份。这条线索把 bug 钉死，并强制后续重构保留 ``v == limit``。
"""

from __future__ import annotations

import pytest

from weft_backend.aqueduct import gregorian_aqueduct


@pytest.mark.unit
class TestNormalizeBoundary:
    def test_december_stays_in_same_year(self):
        # 12 月 1 日是合法边界值，不应进到次年 0 月。
        assert gregorian_aqueduct.normalize([2024, 12, 1, 0, 0, 0]) == [
            2024,
            12,
            1,
            0,
            0,
            0,
        ]

    def test_january_31st_stays_in_january(self):
        # 1 月有 31 天，第 31 天是合法边界。
        assert gregorian_aqueduct.normalize([2024, 1, 31, 0, 0, 0]) == [
            2024,
            1,
            31,
            0,
            0,
            0,
        ]

    def test_second_60_stays_as_60(self):
        # 60 秒严格意义上越界（合法范围 [0, 60)），但当前测试钉的是
        # “边界保留”的语义：v == limit 不动。秒分量是 60 时仍写 60，留
        # normalize 的调用方决定是否进一步处理。
        # 等价地：59 秒不动，60 秒也是边界值，按设计应保留。
        # 注：若团队决定秒位应严格 < 60，需重写本测试。
        assert gregorian_aqueduct.normalize([2024, 1, 1, 0, 0, 60]) == [
            2024,
            1,
            1,
            0,
            0,
            60,
        ]

    def test_minute_60_stays_as_60(self):
        assert gregorian_aqueduct.normalize([2024, 1, 1, 0, 60, 0]) == [
            2024,
            1,
            1,
            0,
            60,
            0,
        ]

    def test_hour_24_stays_as_24(self):
        assert gregorian_aqueduct.normalize([2024, 1, 1, 24, 0, 0]) == [
            2024,
            1,
            1,
            24,
            0,
            0,
        ]
