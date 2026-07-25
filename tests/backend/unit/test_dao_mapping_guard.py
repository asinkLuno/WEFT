"""Spec 5: _mapping 类型守门。

``_mapping`` 是 dao 内部所有 ``raw.get(key, {})`` 后立刻调用的类型守门——
确保往下传的是 Mapping 而不是 list / str / int。失败时抛
``SchemaError MAPPING_EXPECTED``，``details["actual_type"]`` 钉死真实类型名，
方便日志和 UI 提示。
"""

from __future__ import annotations

import pytest

from weft_backend.dao import _mapping
from weft_backend.errors import SchemaError


@pytest.mark.unit
class TestMappingPassthrough:
    def test_empty_dict_passes_through(self):
        result = _mapping({}, path=("story",))
        assert result == {}

    def test_populated_dict_passes_through(self):
        # 注意：返回类型是 RawMapping（Mapping[str, Any]），不强制 dict；
        # 但 dict 是 Mapping 的子类，所以身份不变。
        original = {"title": "x", "moais": []}
        result = _mapping(original, path=("story",))
        assert result is original

    def test_path_not_in_result_when_mapping_valid(self):
        # 守门只在校验失败时用 path；成功路径不返回错误对象。
        _mapping({}, path=("a", "b"))


@pytest.mark.unit
class TestMappingRejects:
    def test_list_raises_mapping_expected(self):
        with pytest.raises(SchemaError) as exc_info:
            _mapping([], path=("moai",))
        assert exc_info.value.code == "MAPPING_EXPECTED"
        assert exc_info.value.details["actual_type"] == "list"
        assert exc_info.value.path == ("moai",)

    def test_str_raises_mapping_expected(self):
        # str 是 Sequence 但不是 Mapping。
        with pytest.raises(SchemaError) as exc_info:
            _mapping("not a mapping", path=("story",))  # type: ignore[arg-type]
        assert exc_info.value.code == "MAPPING_EXPECTED"
        assert exc_info.value.details["actual_type"] == "str"

    def test_int_raises_mapping_expected(self):
        with pytest.raises(SchemaError) as exc_info:
            _mapping(42, path=("story",))  # type: ignore[arg-type]
        assert exc_info.value.code == "MAPPING_EXPECTED"
        assert exc_info.value.details["actual_type"] == "int"

    def test_none_raises_mapping_expected(self):
        # 没有特殊情况——None 不是 Mapping，直接拒绝（调用方需要先 .get(..., {}) 兜底）。
        with pytest.raises(SchemaError) as exc_info:
            _mapping(None, path=("story",))  # type: ignore[arg-type]
        assert exc_info.value.code == "MAPPING_EXPECTED"
        assert exc_info.value.details["actual_type"] == "NoneType"

    def test_path_preserved_in_error(self):
        # 长路径不应被截断或重写。
        with pytest.raises(SchemaError) as exc_info:
            _mapping([], path=("drift", "season_1", "event_x", "moais"))
        assert exc_info.value.path == ("drift", "season_1", "event_x", "moais")
