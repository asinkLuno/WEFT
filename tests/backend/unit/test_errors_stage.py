"""Spec 1: ErrorStage 字符串值契约。

8 个 stage 的字符串值是跨进程稳定契约（前端 i18n、MCP 工具错误码、日志检索
都依赖），改名等于破坏外部 API。钉死每个成员的 ``.value`` 与 ``str(...)``。
"""

from __future__ import annotations

import pytest

from weft_backend.errors import ErrorStage


@pytest.mark.unit
@pytest.mark.parametrize(
    "member, value",
    [
        (ErrorStage.FILE, "file"),
        (ErrorStage.PARSE, "parse"),
        (ErrorStage.SCHEMA, "schema"),
        (ErrorStage.REFERENCE, "reference"),
        (ErrorStage.TIMELINE, "timeline"),
        (ErrorStage.PLUGIN, "plugin"),
        (ErrorStage.STATE, "state"),
        (ErrorStage.INTERNAL, "internal"),
    ],
)
def test_error_stage_value_is_stable_string(member: ErrorStage, value: str) -> None:
    # StrEnum：member == value 比较、str(member) 都给字符串值。
    assert member.value == value
    assert str(member) == value


@pytest.mark.unit
def test_error_stage_has_eight_members() -> None:
    # 防止有人偷偷加 stage 不更新文档；8 个是当前契约。
    assert len(list(ErrorStage)) == 8
