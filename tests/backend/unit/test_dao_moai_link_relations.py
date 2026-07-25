"""Spec 10: MoaiLink.from_dict relations 校验、bidirectional 默认、Pydantic 包装。

``relations`` 是必填字段，缺 key 抛 ``MOAI_LINK_RELATIONS_REQUIRED``；
键存在但类型错（``None`` / ``[]`` / ``{}``）走 Pydantic 校验失败，包成
``MOAI_LINK_INVALID``。``bidirectional`` 缺省 ``True``，Pydantic 对 ``1`` / ``0``
/ ``"yes"`` 等做强制转换；明显非法值（``"invalid"``）也走
``MOAI_LINK_INVALID``。
"""

from __future__ import annotations

import pytest

from weft_backend.aqueduct import gregorian_aqueduct
from weft_backend.dao import Moai, MoaiLink
from weft_backend.errors import SchemaError


def _registry() -> dict:
    return {
        name: Moai.from_dict(name, {"description": "D"}, gregorian_aqueduct)
        for name in ("a", "b")
    }


@pytest.mark.unit
class TestMoaiLinkRelationsRequired:
    def test_missing_relations_raises_relations_required(self):
        # 缺 relations key —— 与「键存在但值非法」走两条不同分支。
        with pytest.raises(SchemaError) as exc_info:
            MoaiLink.from_dict({"moais": ["a", "b"]}, moais=_registry())
        err = exc_info.value
        assert err.code == "MOAI_LINK_RELATIONS_REQUIRED"
        assert err.path == ("moai_link", "relations")


@pytest.mark.unit
class TestMoaiLinkInvalidWrapped:
    @pytest.mark.parametrize("relations_value", [None, [], {}])
    def test_wrong_type_relations_wrapped_as_invalid(self, relations_value):
        # 键存在但 Pydantic 拒收 → MOAI_LINK_INVALID。
        with pytest.raises(SchemaError) as exc_info:
            MoaiLink.from_dict(
                {"moais": ["a", "b"], "relations": relations_value},
                moais=_registry(),
            )
        assert exc_info.value.code == "MOAI_LINK_INVALID"
        # validation_error 把首个 issue 的 loc 拼到 path 后面。
        # 这里 path 是 ("moai_link",) 默认值；loc 含 "relations"。
        assert "relations" in exc_info.value.path

    def test_invalid_bidirectional_wrapped_as_invalid(self):
        # Pydantic 对 bool 严格；非 "yes"/"true"/0/1 之类的字符串会被拒。
        with pytest.raises(SchemaError) as exc_info:
            MoaiLink.from_dict(
                {
                    "moais": ["a", "b"],
                    "relations": "x",
                    "bidirectional": "invalid",
                },
                moais=_registry(),
            )
        assert exc_info.value.code == "MOAI_LINK_INVALID"


@pytest.mark.unit
class TestMoaiLinkBidirectionalDefault:
    def test_bidirectional_defaults_to_true(self):
        link = MoaiLink.from_dict(
            {"moais": ["a", "b"], "relations": "x"},
            moais=_registry(),
        )
        assert link.bidirectional is True

    def test_explicit_false_preserved(self):
        link = MoaiLink.from_dict(
            {"moais": ["a", "b"], "relations": "x", "bidirectional": False},
            moais=_registry(),
        )
        assert link.bidirectional is False

    def test_pydantic_coerces_one_to_true(self):
        # Pydantic 把 1/0/"yes" 等 coerce 成 bool；这是 Pydantic 默认行为，不是
        # 我们自己的代码。钉死它防止 schema 配置变化（比如 strict 模式）静默
        # 破坏现有故事文件。
        link = MoaiLink.from_dict(
            {"moais": ["a", "b"], "relations": "x", "bidirectional": 1},
            moais=_registry(),
        )
        assert link.bidirectional is True


@pytest.mark.unit
class TestMoaiLinkHappyPath:
    def test_full_payload_constructs_link(self):
        link = MoaiLink.from_dict(
            {
                "moais": ["a", "b"],
                "relations": "enemy of",
                "bidirectional": True,
            },
            moais=_registry(),
        )
        assert link.relations == "enemy of"
        assert link.bidirectional is True
        # moais 字段是 Moai 实例元组，不是字符串。
        assert isinstance(link.moais, tuple)
        assert link.moais[0].name == "a"
        assert link.moais[1].name == "b"
