"""Spec 7: humanize_english_gregorian 的单复数规则。

英文版用 ``abs(value) == 1`` 判单数，所以 ``-1`` 也走单数分支。全零占位
是 ``"0 years, 0 months, 0 days"``（三个复数）。本文件钉 ``gregorian_en_aqueduct``
作为这条 humanizer 的唯一现成实例。
"""

from __future__ import annotations

import pytest

from weft_backend.aqueduct import gregorian_en_aqueduct


@pytest.mark.unit
class TestHumanizeEnglishSingularPlural:
    def test_all_zero_returns_plural_placeholder(self):
        # 三个分量（年/月/日），都复数。比中文版少「日以后」的占位。
        assert (
            gregorian_en_aqueduct.humanize([0, 0, 0, 0, 0, 0])
            == "0 years, 0 months, 0 days"
        )

    def test_one_year_singular(self):
        assert gregorian_en_aqueduct.humanize([1, 0, 0, 0, 0, 0]) == "1 year"

    def test_two_years_plural(self):
        assert gregorian_en_aqueduct.humanize([2, 0, 0, 0, 0, 0]) == "2 years"

    def test_minus_one_year_is_singular(self):
        # 单复数走 abs(value) == 1，所以 -1 year 也是单数。
        assert gregorian_en_aqueduct.humanize([-1, 0, 0, 0, 0, 0]) == "-1 year"

    def test_minus_two_years_is_plural(self):
        assert gregorian_en_aqueduct.humanize([-2, 0, 0, 0, 0, 0]) == "-2 years"

    def test_each_unit_singular(self):
        # 六个分量各一个：1 year, 1 month, 1 day, 1 hour, 1 minute, 1 second。
        assert (
            gregorian_en_aqueduct.humanize([1, 1, 1, 1, 1, 1])
            == "1 year, 1 month, 1 day, 1 hour, 1 minute, 1 second"
        )

    def test_each_unit_plural(self):
        assert (
            gregorian_en_aqueduct.humanize([2, 2, 2, 2, 2, 2])
            == "2 years, 2 months, 2 days, 2 hours, 2 minutes, 2 seconds"
        )

    def test_dec_1st_2024(self):
        # 2024-12-1：年复数、月复数、日单数。
        assert (
            gregorian_en_aqueduct.humanize([2024, 12, 1, 0, 0, 0])
            == "2024 years, 12 months, 1 day"
        )

    def test_skips_zero_components(self):
        assert (
            gregorian_en_aqueduct.humanize([1, 0, 1, 0, 0, 0])
            == "1 year, 1 day"
        )
