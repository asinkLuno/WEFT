"""Spec 1: _phase 对短列表零填充到 aqueduct brick 数。

公历 aqueduct 有 6 个 brick（年/月/日/时/分/秒）；用户在故事文件里写
``[2024]`` 或 ``[2024, 7]`` 是合法的——_phase 负责把缺省的尾部分量补 0。
"""

from __future__ import annotations

import pytest

from weft_backend.aqueduct import gregorian_aqueduct
from weft_backend.dao import _phase


@pytest.mark.unit
@pytest.mark.parametrize(
    "data, expected_base",
    [
        ([2024], [2024, 0, 0, 0, 0, 0]),
        ([2024, 7], [2024, 7, 0, 0, 0, 0]),
        ([2024, 7, 25], [2024, 7, 25, 0, 0, 0]),
        ([2024, 7, 25, 12], [2024, 7, 25, 12, 0, 0]),
        ([2024, 7, 25, 12, 30], [2024, 7, 25, 12, 30, 0]),
        ([2024, 7, 25, 12, 30, 45], [2024, 7, 25, 12, 30, 45]),
    ],
)
def test_phase_pads_short_list_to_brick_count(data: list, expected_base: list) -> None:
    phase = _phase(data, gregorian_aqueduct)
    assert phase.base_time == expected_base
    assert phase.ref_time is None


@pytest.mark.unit
def test_phase_full_length_does_not_pad():
    # 长度刚好等于 brick 数时不应加任何 0。
    phase = _phase([1, 2, 3, 4, 5, 6], gregorian_aqueduct)
    assert phase.base_time == [1, 2, 3, 4, 5, 6]
