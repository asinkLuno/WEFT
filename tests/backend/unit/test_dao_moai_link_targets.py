"""Spec 9: MoaiLink.from_dict targets 守门 + 引用。

``moais`` 必须是恰好 2 个字符串的列表，且每个名字必须在 moai 注册表里。
- ``MOAI_LINK_TARGETS_INVALID``：非 list / 长度 != 2 / 含非 str
- ``MOAI_LINK_TARGET_NOT_FOUND``：第一个缺失名触发，``details["moai"]`` 钉死
"""

from __future__ import annotations

import pytest

from weft_backend.aqueduct import gregorian_aqueduct
from weft_backend.dao import Moai, MoaiLink
from weft_backend.errors import ReferenceError, SchemaError


def _registry(*names: str) -> dict:
    return {
        name: Moai.from_dict(name, {"description": "D"}, gregorian_aqueduct)
        for name in names
    }


@pytest.mark.unit
@pytest.mark.parametrize(
    "targets",
    [
        None,  # 缺 key 或显式 None
        "a",  # str 不是 list
        ["a"],  # 长度 1
        ["a", "b", "c"],  # 长度 3
        ["a", 1],  # 含非 str
        [1, 2],  # 全非 str
    ],
)
def test_invalid_targets_raises_moai_link_targets_invalid(targets) -> None:
    with pytest.raises(SchemaError) as exc_info:
        MoaiLink.from_dict(
            {"moais": targets, "relations": "x"},
            moais=_registry("a", "b"),
            path=("moai_link", "label", 0),
        )
    err = exc_info.value
    assert err.code == "MOAI_LINK_TARGETS_INVALID"
    assert err.path == ("moai_link", "label", 0, "moais")


@pytest.mark.unit
class TestMoaiLinkTargetNotFound:
    def test_second_target_missing_raises(self):
        with pytest.raises(ReferenceError) as exc_info:
            MoaiLink.from_dict(
                {"moais": ["real", "ghost"], "relations": "x"},
                moais=_registry("real"),
            )
        err = exc_info.value
        assert err.code == "MOAI_LINK_TARGET_NOT_FOUND"
        assert err.details == {"moai": "ghost"}
        assert err.path == ("moai_link", "moais")

    def test_first_target_missing_wins(self):
        # 两个都缺时按顺序触发第一个。
        with pytest.raises(ReferenceError) as exc_info:
            MoaiLink.from_dict(
                {"moais": ["ghost1", "ghost2"], "relations": "x"},
                moais={},
            )
        assert exc_info.value.details == {"moai": "ghost1"}

    def test_both_present_does_not_raise(self):
        # 对照样：两个都在注册表里时 targets 校验和引用查找都通过。
        # 不验证完整构造（那是 Spec 10）；只验证不抛上述两类错误。
        try:
            MoaiLink.from_dict(
                {"moais": ["a", "b"], "relations": "x"},
                moais=_registry("a", "b"),
            )
        except (SchemaError, ReferenceError) as exc:
            raise AssertionError(f"未预期的错误: {exc}") from exc
