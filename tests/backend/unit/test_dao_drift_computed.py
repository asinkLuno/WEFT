"""Spec 2: Drift 的 6 个 computed_field。

公历 aqueduct 下：
- ``flat_start`` / ``flat_end`` 是 ``de_recursive`` 的结果（list[int]）。
- ``start_tick`` / ``end_tick`` 是 ``to_tick`` 的结果（int）。
- ``start_time_display`` / ``end_time_display`` 是 ``humanize`` 的结果（str）。

``end_time=None`` 时，``flat_end`` / ``end_tick`` / ``end_time_display`` 都为 None；
其余三个始终计算。本文件只测 computed_field；``from_dict`` 的封装由 Spec 1 等覆盖。
"""

from __future__ import annotations

import pytest

from weft_backend.aqueduct import Phase, gregorian_aqueduct
from weft_backend.dao import Drift


def _make_drift(start: list[int], end: list[int] | None = None) -> Drift:
    # Drift 直接构造时不会零填充 Phase（那是 _phase 的责任）；这里手动补 6 位。
    pad = 6 - len(start)
    padded_start = start + [0] * pad
    padded_end = None
    if end is not None:
        pad_end = 6 - len(end)
        padded_end = end + [0] * pad_end
    return Drift(
        id="g/t",
        title="t",
        start_time=Phase(base_time=padded_start),
        end_time=Phase(base_time=padded_end) if padded_end is not None else None,
        aqueduct=gregorian_aqueduct,
    )


@pytest.mark.unit
class TestDriftFlat:
    def test_flat_start_runs_de_recursive(self):
        drift = _make_drift([2024, 1, 1])
        assert drift.flat_start == [2024, 1, 1, 0, 0, 0]

    def test_flat_end_returns_none_when_end_time_omitted(self):
        drift = _make_drift([2024, 1, 1])
        assert drift.flat_end is None

    def test_flat_end_runs_de_recursive_when_end_time_set(self):
        drift = _make_drift([2024, 1, 1], end=[2024, 1, 2])
        assert drift.flat_end == [2024, 1, 2, 0, 0, 0]


@pytest.mark.unit
class TestDriftTick:
    def test_start_tick_is_int(self):
        drift = _make_drift([2024, 1, 1])
        assert isinstance(drift.start_tick, int)
        # 公历相邻日差 86400 在 aqueduct 测试里钉过；这里复用。
        other = _make_drift([2024, 1, 2])
        assert other.start_tick - drift.start_tick == 86400

    def test_end_tick_is_none_when_end_time_omitted(self):
        drift = _make_drift([2024, 1, 1])
        assert drift.end_tick is None

    def test_end_tick_set_when_end_time_present(self):
        drift = _make_drift([2024, 1, 1], end=[2024, 1, 2])
        assert drift.end_tick == drift.start_tick + 86400


@pytest.mark.unit
class TestDriftDisplay:
    def test_start_time_display_uses_humanize(self):
        drift = _make_drift([2024, 1, 1])
        assert drift.start_time_display == "2024年1月1日"

    def test_end_time_display_is_none_when_end_time_omitted(self):
        drift = _make_drift([2024, 1, 1])
        assert drift.end_time_display is None

    def test_end_time_display_uses_humanize_when_end_time_set(self):
        drift = _make_drift([2024, 1, 1], end=[2024, 1, 2])
        assert drift.end_time_display == "2024年1月2日"
