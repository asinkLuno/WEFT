"""Spec 6: Aqueduct.humanize 默认中文渲染与全零占位。

``gregorian_aqueduct`` 没有自定义 humanizer，走默认分支：全零返回占位串
``"0年0月0日"``；非零时拼出非零分量（``value`` 为 0 的位置直接跳过）。本
文件钉死默认分支；英文版由 ``test_aqueduct_humanize_en.py`` 覆盖。
"""

from __future__ import annotations

import pytest

from weft_backend.aqueduct import gregorian_aqueduct


@pytest.mark.unit
class TestHumanizeDefault:
    def test_all_zero_returns_placeholder(self):
        # any() 为 False → 占位串。注意占位串只到「日」，不写时分秒。
        assert gregorian_aqueduct.humanize([0, 0, 0, 0, 0, 0]) == "0年0月0日"

    def test_only_year_non_zero(self):
        assert gregorian_aqueduct.humanize([1, 0, 0, 0, 0, 0]) == "1年"

    def test_only_month_non_zero(self):
        # 单独的非零月份不该走到全零占位。
        assert gregorian_aqueduct.humanize([0, 1, 0, 0, 0, 0]) == "1月"

    def test_year_month_day_concatenate(self):
        # 整套年月日（2024 年 12 月 1 日）—— 同时回归 normalize 修复后 12 月
        # 不再变成 0 月的场景。
        assert gregorian_aqueduct.humanize([2024, 12, 1, 0, 0, 0]) == "2024年12月1日"

    def test_all_six_components_present(self):
        assert (
            gregorian_aqueduct.humanize([1, 1, 1, 1, 1, 1])
            == "1年1月1日1时1分1秒"
        )

    def test_skips_zero_components_in_middle(self):
        # 0 分被跳过，前后分量顺序保持。
        assert gregorian_aqueduct.humanize([1, 1, 1, 1, 0, 1]) == "1年1月1日1时1秒"

    def test_negative_components_rendered_with_sign(self):
        # any() 对负数也返回 True；负数原样拼出（带负号）。
        assert gregorian_aqueduct.humanize([-1, 0, 0, 0, 0, 0]) == "-1年"
