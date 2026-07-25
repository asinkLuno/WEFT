"""Spec 6: 7 个 stage 子类自动绑定 stage。

子类构造时不传 stage，基类 ``__init__`` 收到 stage 后写入 ``self.stage``。
钉死每个子类的 stage 绑定，防止有人重构时不小心改了 stage 默认值。
"""

from __future__ import annotations

import pytest

from weft_backend.errors import (
    ErrorStage,
    FileError,
    ParseError,
    PluginError,
    ReferenceError,
    SchemaError,
    StateError,
    TimelineError,
)


@pytest.mark.unit
@pytest.mark.parametrize(
    "cls, stage",
    [
        (FileError, ErrorStage.FILE),
        (ParseError, ErrorStage.PARSE),
        (SchemaError, ErrorStage.SCHEMA),
        (ReferenceError, ErrorStage.REFERENCE),
        (TimelineError, ErrorStage.TIMELINE),
        (PluginError, ErrorStage.PLUGIN),
        (StateError, ErrorStage.STATE),
    ],
)
def test_subclass_pins_stage(cls, stage: ErrorStage) -> None:
    err = cls("CODE", "msg")
    assert err.stage is stage


@pytest.mark.unit
def test_subclass_to_dict_stage_value_matches_string() -> None:
    # 顺带钉死 to_dict 出来的 stage 字符串也对得上。
    assert FileError("CODE", "msg").to_dict()["stage"] == "file"
    assert ParseError("CODE", "msg").to_dict()["stage"] == "parse"
    assert SchemaError("CODE", "msg").to_dict()["stage"] == "schema"
    assert ReferenceError("CODE", "msg").to_dict()["stage"] == "reference"
    assert TimelineError("CODE", "msg").to_dict()["stage"] == "timeline"
    assert PluginError("CODE", "msg").to_dict()["stage"] == "plugin"
    assert StateError("CODE", "msg").to_dict()["stage"] == "state"
