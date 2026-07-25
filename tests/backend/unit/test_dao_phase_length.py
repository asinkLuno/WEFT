"""Spec 4: _phase 拒绝长度越界。

公历 aqueduct 的 brick 数是 6。两种形式分别有独立的长度上限：
- 纯 base 形式 ``[a,b,c,...]``：data 长度 ≤ 6，越界抛 TIME_VALUE_INVALID。
- 嵌套形式 ``[a,b,...,[ref]]``：base 长度 ≤ 6，越界抛 TIME_OFFSET_INVALID。
"""

from __future__ import annotations

import pytest

from weft_backend.aqueduct import gregorian_aqueduct
from weft_backend.dao import _phase
from weft_backend.errors import SchemaError


@pytest.mark.unit
class TestPhaseRejectsTooLongFlat:
    def test_seven_ints_raises_time_value_invalid(self):
        # 6 是上限；7 个 int 严格越界。
        with pytest.raises(SchemaError) as exc_info:
            _phase([1, 2, 3, 4, 5, 6, 7], gregorian_aqueduct)
        assert exc_info.value.code == "TIME_VALUE_INVALID"
        assert exc_info.value.details["expected_max_length"] == 6

    def test_twenty_ints_raises_time_value_invalid(self):
        # 远越界同样分支；构造极端输入确保不漏。
        with pytest.raises(SchemaError) as exc_info:
            _phase(list(range(20)), gregorian_aqueduct)
        assert exc_info.value.code == "TIME_VALUE_INVALID"


@pytest.mark.unit
class TestPhaseRejectsTooLongOffsetBase:
    def test_seven_int_base_with_ref_raises_time_offset_invalid(self):
        # 嵌套形式：base 7 个 int + ref → TIME_OFFSET_INVALID（不是 TIME_VALUE_INVALID）。
        with pytest.raises(SchemaError) as exc_info:
            _phase([1, 2, 3, 4, 5, 6, 7, [0, 1, 0]], gregorian_aqueduct)
        assert exc_info.value.code == "TIME_OFFSET_INVALID"
        assert exc_info.value.details["expected_max_length"] == 6

    def test_six_int_base_with_ref_is_accepted(self):
        # 边界：base 恰好 6 个 + ref —— 合法，因为 base 长度 == brick 数。
        phase = _phase([1, 2, 3, 4, 5, 6, [0, 1, 0]], gregorian_aqueduct)
        assert phase.base_time == [1, 2, 3, 4, 5, 6]
        assert phase.ref_time is not None
        assert phase.ref_time.base_time == [0, 1, 0, 0, 0, 0]
