"""Spec 3: _phase 拒绝空 / 非 list / 含非 int 元素。

错误码分两支：
- ``TIME_NOT_LIST``：data 不是 list、或是空 list（无法从中提取 base）。
- ``TIME_VALUE_INVALID``：data 是 list 但含非 int 元素（在纯 base 形式下）。
- ``TIME_OFFSET_INVALID``：data 是 ``[base..., ref]`` 形式但 base 含非 int 元素。
"""

from __future__ import annotations

import pytest

from weft_backend.aqueduct import gregorian_aqueduct
from weft_backend.dao import _phase
from weft_backend.errors import SchemaError


@pytest.mark.unit
class TestPhaseRejectsNonList:
    def test_empty_list_raises_time_not_list(self):
        with pytest.raises(SchemaError) as exc_info:
            _phase([], gregorian_aqueduct)
        assert exc_info.value.code == "TIME_NOT_LIST"

    def test_string_raises_time_not_list(self):
        # str 是 Sequence 但不是 list；_phase 显式要求 list。
        with pytest.raises(SchemaError) as exc_info:
            _phase("2024", gregorian_aqueduct)  # type: ignore[arg-type]
        assert exc_info.value.code == "TIME_NOT_LIST"

    def test_none_raises_time_not_list(self):
        with pytest.raises(SchemaError) as exc_info:
            _phase(None, gregorian_aqueduct)  # type: ignore[arg-type]
        assert exc_info.value.code == "TIME_NOT_LIST"

    def test_int_raises_time_not_list(self):
        with pytest.raises(SchemaError) as exc_info:
            _phase(2024, gregorian_aqueduct)  # type: ignore[arg-type]
        assert exc_info.value.code == "TIME_NOT_LIST"


@pytest.mark.unit
class TestPhaseRejectsNonIntElements:
    def test_string_element_in_base_raises_time_value_invalid(self):
        with pytest.raises(SchemaError) as exc_info:
            _phase([2024, "1"], gregorian_aqueduct)  # type: ignore[list-item]
        assert exc_info.value.code == "TIME_VALUE_INVALID"

    def test_float_element_raises_time_value_invalid(self):
        # type(v) is int 严格判定，float 不被接受。
        with pytest.raises(SchemaError) as exc_info:
            _phase([2024, 1.5], gregorian_aqueduct)  # type: ignore[list-item]
        assert exc_info.value.code == "TIME_VALUE_INVALID"

    def test_bool_element_raises_time_value_invalid(self):
        # bool 是 int 子类，但 type(True) is int 为 False；与 aqueduct 的严格
        # 校验保持一致。
        with pytest.raises(SchemaError) as exc_info:
            _phase([True], gregorian_aqueduct)  # type: ignore[list-item]
        assert exc_info.value.code == "TIME_VALUE_INVALID"


@pytest.mark.unit
class TestPhaseRejectsBadNestedOffset:
    def test_string_in_offset_base_raises_time_offset_invalid(self):
        # 嵌套形式下 base 含非 int → TIME_OFFSET_INVALID（不是 TIME_VALUE_INVALID）。
        with pytest.raises(SchemaError) as exc_info:
            _phase([2024, "1", [0, 1, 0]], gregorian_aqueduct)  # type: ignore[list-item]
        assert exc_info.value.code == "TIME_OFFSET_INVALID"

    def test_float_in_offset_base_raises_time_offset_invalid(self):
        with pytest.raises(SchemaError) as exc_info:
            _phase([1.5, [0, 1, 0]], gregorian_aqueduct)  # type: ignore[list-item]
        assert exc_info.value.code == "TIME_OFFSET_INVALID"
