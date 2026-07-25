"""Spec 3: Aqueduct.normalize 在 ``日`` 位缺月份上下文时的兜底借位。

当 ``get_days_in_month`` 因 ``月=0`` 返回 ``maxsize``（语义：偏移量型时间，
``[10, 0, 0, ...]`` 表示纯 “10 年”）时，负日无法知道该按几个月借位。源码用
``ponytail`` 兜底：假定 31 天作为最长月份，避免 ``maxsize`` 让借位卡住。
"""

from __future__ import annotations

import pytest

from weft_backend.aqueduct import gregorian_aqueduct


@pytest.mark.unit
class TestNormalizePonytail:
    def test_negative_day_with_no_month_borrows_using_31(self):
        # 月=0、日=-1：触发 ponytail，按 31 天借位。
        # -1 % 31 = 30, -1 // 31 = -1；月位接着 -1，借到 11；年位 -1。
        assert gregorian_aqueduct.normalize([2024, 0, -1, 0, 0, 0]) == [
            2023,
            11,
            30,
            0,
            0,
            0,
        ]

    def test_negative_day_chain_overflows_into_month(self):
        # 月=0、日=-32：超过 31 天的兜底长度，继续向月借。
        # -32 % 31 = 30, -32 // 31 = -2；月位 0 + (-2) = -2，借成 10；年位 -1。
        assert gregorian_aqueduct.normalize([2024, 0, -32, 0, 0, 0]) == [
            2023,
            10,
            30,
            0,
            0,
            0,
        ]

    def test_negative_day_at_31_boundary_borrows_to_zero(self):
        # -31 = -1 * 31 + 0：日位被借成 0，月位借 1。
        assert gregorian_aqueduct.normalize([2024, 0, -31, 0, 0, 0]) == [
            2023,
            11,
            0,
            0,
            0,
            0,
        ]

    def test_positive_day_with_no_month_does_not_trigger_ponytail(self):
        # ponytail 只在 v<0 时兜底；正数日份原样保留（语义：偏移量型时间）。
        assert gregorian_aqueduct.normalize([2024, 0, 15, 0, 0, 0]) == [
            2024,
            0,
            15,
            0,
            0,
            0,
        ]

    def test_negative_day_with_real_month_uses_actual_month_length(self):
        # 对照样：月=5（5 月，31 天）的负日走正常借位，不进 ponytail 分支。
        assert gregorian_aqueduct.normalize([2024, 5, -1, 0, 0, 0]) == [
            2024,
            4,
            30,
            0,
            0,
            0,
        ]

    def test_negative_day_with_february_uses_28_days(self):
        # 对照样：2023 年 2 月（平年 28 天）的负日走正常借位。
        assert gregorian_aqueduct.normalize([2023, 2, -1, 0, 0, 0]) == [
            2023,
            1,
            27,
            0,
            0,
            0,
        ]
