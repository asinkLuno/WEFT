"""Spec 9: Moai.apply_material 对未注册 material 抛 ReferenceError。

material 注册表是全局的（``MATERIALS``）；未注册的名称查 ``.get()`` 返回 None，
触发 ``MATERIAL_NOT_FOUND``。path 固定到 ``("moai", self.name, "materials")``，
``details["material"]`` 钉死原名称方便日志检索。
"""

from __future__ import annotations

import pytest

from weft_backend.aqueduct import gregorian_aqueduct
from weft_backend.dao import Moai
from weft_backend.errors import ReferenceError


@pytest.mark.unit
class TestApplyMaterialMissing:
    def test_unknown_material_name_raises(self):
        moai = Moai.from_dict("guojing", {"description": "D"}, gregorian_aqueduct)
        with pytest.raises(ReferenceError) as exc_info:
            moai.apply_material("does-not-exist")
        assert exc_info.value.code == "MATERIAL_NOT_FOUND"
        assert exc_info.value.path == ("moai", "guojing", "materials")
        assert exc_info.value.details == {"material": "does-not-exist"}

    def test_empty_string_material_name_raises(self):
        # 空串不是合法 material 名；同样走 MATERIAL_NOT_FOUND 分支。
        moai = Moai.from_dict("guojing", {"description": "D"}, gregorian_aqueduct)
        with pytest.raises(ReferenceError) as exc_info:
            moai.apply_material("")
        assert exc_info.value.code == "MATERIAL_NOT_FOUND"
        assert exc_info.value.details == {"material": ""}


@pytest.mark.unit
class TestApplyMaterialKnown:
    def test_builtin_constellation_returns_value(self):
        # 正向路径：内置 constellation 接收 moai，返回字符串。
        # 只验证 apply_material 把注册函数的返回值透传出来；constellation 自身的
        # 行为归 material.py 自己的测试覆盖。
        moai = Moai.from_dict(
            "guojing",
            {"description": "D", "base_time": [2024, 7, 25]},
            gregorian_aqueduct,
        )
        result = moai.apply_material("constellation")
        # constellation 返回字符串（狮子座之类的）；只断言类型。
        assert isinstance(result, str)
        assert result  # 非空
