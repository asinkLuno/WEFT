"""Spec 3: WeftError 构造默认值与必填项。

``WeftError`` 是所有 stage 子类的基类，构造契约必须钉死：code/message/stage
必填（stage 是 keyword-only），其它字段全部有默认值，``details=None`` 归一
成空 dict（防止后续 ``.update`` 触发 AttributeError），``source=Path(...)``
归一成字符串。
"""

from __future__ import annotations

from pathlib import Path

import pytest

from weft_backend.errors import ErrorStage, WeftError


@pytest.mark.unit
class TestWeftErrorConstruction:
    def test_required_fields_set(self):
        err = WeftError("CODE", "msg", stage=ErrorStage.INTERNAL)
        assert err.code == "CODE"
        assert err.message == "msg"
        assert err.stage is ErrorStage.INTERNAL

    def test_stage_is_keyword_only(self):
        # signature 是 (code, message, *, stage, ...)；stage 不能位置传。
        # Python 会抛 TypeError，匹配 "stage" 关键字让报错可读。
        with pytest.raises(TypeError):
            WeftError("CODE", "msg", ErrorStage.INTERNAL)  # type: ignore[misc]

    def test_optional_fields_default_to_none(self):
        err = WeftError("CODE", "msg", stage=ErrorStage.INTERNAL)
        assert err.path == ()
        assert err.source is None
        assert err.line is None
        assert err.column is None
        assert err.hint is None

    def test_details_none_normalizes_to_empty_dict(self):
        # details or {} —— 调用方可以安全 err.details.update(...) 而不检查 None。
        err = WeftError("CODE", "msg", stage=ErrorStage.INTERNAL, details=None)
        assert err.details == {}

    def test_details_dict_preserved(self):
        err = WeftError(
            "CODE",
            "msg",
            stage=ErrorStage.INTERNAL,
            details={"k": "v"},
        )
        assert err.details == {"k": "v"}

    def test_path_object_source_normalizes_to_string(self):
        # source 接受 str | Path | None；内部存 str。
        err = WeftError(
            "CODE",
            "msg",
            stage=ErrorStage.FILE,
            source=Path("/tmp/story.yml"),
        )
        assert err.source == "/tmp/story.yml"

    def test_string_source_preserved_as_is(self):
        err = WeftError("CODE", "msg", stage=ErrorStage.FILE, source="story.yml")
        assert err.source == "story.yml"


@pytest.mark.unit
class TestWeftErrorInheritance:
    def test_is_value_error_subclass(self):
        # WeftError 继承 ValueError；老的 except ValueError 仍能兜住。
        err = WeftError("CODE", "msg", stage=ErrorStage.INTERNAL)
        assert isinstance(err, ValueError)

    def test_super_message_propagates_to_args(self):
        # super().__init__(message) 让 ValueError.args 也带 message。
        err = WeftError("CODE", "hello", stage=ErrorStage.INTERNAL)
        assert err.args == ("hello",)
