"""Spec 8: Moai.from_dict 字段分流。

已知键（model_fields：name/base_time/description/materials/extra_props/aqueduct/journal）
进对应字段；未知键进 ``extra_props``；``base_time`` / ``description`` / ``materials``
缺省分别为 None / "" / []。本文件只覆盖字段分流，不测 material 计算（Spec 10）。
"""

from __future__ import annotations

import pytest

from weft_backend.aqueduct import gregorian_aqueduct
from weft_backend.dao import Moai


@pytest.mark.unit
class TestMoaiFromDictFieldSplit:
    def test_minimal_payload_only_description(self):
        # description 是必填字段（pydantic 端）；其它字段走默认值。
        moai = Moai.from_dict("guojing", {"description": "D"}, gregorian_aqueduct)
        assert moai.name == "guojing"
        assert moai.base_time is None
        assert moai.description == "D"
        assert moai.materials == []
        assert moai.extra_props is None

    def test_description_defaults_to_empty_string(self):
        # data.get("description", "") —— 没写就当空串。
        moai = Moai.from_dict("guojing", {}, gregorian_aqueduct)
        assert moai.description == ""

    def test_base_time_parsed_into_phase(self):
        moai = Moai.from_dict(
            "guojing",
            {"description": "D", "base_time": [2024, 7, 25]},
            gregorian_aqueduct,
        )
        assert moai.base_time is not None
        assert moai.base_time.base_time == [2024, 7, 25, 0, 0, 0]
        assert moai.base_time.ref_time is None

    def test_materials_list_preserved(self):
        # 注意：material 查找由 conftest 的 reset_material_registry 重置到内置基线；
        # 用户插件（如 dnd）在 unit 层不可用。Spec 9 / Spec 10 单独覆盖 material 行为。
        # 这里只验证 materials 字段被原样保留，不触发计算。
        moai = Moai.from_dict(
            "guojing",
            {"description": "D", "materials": []},
            gregorian_aqueduct,
        )
        assert moai.materials == []

    def test_unknown_keys_go_to_extra_props(self):
        # 单个未知键。
        moai = Moai.from_dict(
            "guojing",
            {"description": "D", "race": "tiefling"},
            gregorian_aqueduct,
        )
        assert moai.extra_props == {"race": "tiefling"}

    def test_multiple_unknown_keys_collected_into_extra_props(self):
        # 多个未知键都进 extra_props，已知键不混入。
        moai = Moai.from_dict(
            "guojing",
            {
                "description": "D",
                "race": "tiefling",
                "class": "sorcerer",
                "level": 5,
            },
            gregorian_aqueduct,
        )
        assert moai.extra_props == {
            "race": "tiefling",
            "class": "sorcerer",
            "level": 5,
        }

    def test_no_unknown_keys_yields_none_extra_props(self):
        # ``extra or None`` —— 没有未知键时显式存 None，不是空 dict。
        moai = Moai.from_dict(
            "guojing",
            {"description": "D", "materials": []},
            gregorian_aqueduct,
        )
        assert moai.extra_props is None
