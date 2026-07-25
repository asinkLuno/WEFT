"""Spec 10: normalize_error 对 WeftError 透传与未知异常兜底。

``normalize_error`` 必须满足两条契约：
1. **透传**：WeftError 实例直接返回（identity 保留），不重新包装；若 source
   提供，调 ``attach_source`` 把 source 写到实例上（已存在则不动）。
2. **兜底**：未知异常类型（``RuntimeError`` 等）回 ``INTERNAL_ERROR``，details
   含 ``exception_type`` 与 ``reason``，stage=INTERNAL。
"""

from __future__ import annotations

import pytest

from weft_backend.errors import (
    ErrorStage,
    ParseError,
    WeftError,
    normalize_error,
)


@pytest.mark.unit
class TestNormalizeWeftErrorPassthrough:
    def test_returns_same_instance(self):
        # identity 保留：调用方拿到的是同一个对象，不是拷贝。
        original = ParseError("PARSE_OOPS", "boom")
        returned = normalize_error(original)
        assert returned is original

    def test_attaches_source_when_provided_and_source_was_none(self):
        original = ParseError("PARSE_OOPS", "boom")
        normalize_error(original, source="story.yml")
        assert original.source == "story.yml"

    def test_does_not_overwrite_existing_source(self):
        # attach_source 守门：source 已存在时不覆盖。
        original = ParseError("PARSE_OOPS", "boom", source="original.yml")
        normalize_error(original, source="attempt.yml")
        assert original.source == "original.yml"


@pytest.mark.unit
class TestNormalizeUnknownFallback:
    def test_runtime_error_falls_back_to_internal_error(self):
        err = normalize_error(RuntimeError("unexpected boom"))
        assert isinstance(err, WeftError)
        assert err.code == "INTERNAL_ERROR"
        assert err.stage is ErrorStage.INTERNAL
        assert err.message == "加载故事时发生未预期错误"

    def test_internal_error_records_exception_type_and_reason(self):
        err = normalize_error(RuntimeError("unexpected boom"))
        assert err.details["exception_type"] == "RuntimeError"
        assert err.details["reason"] == "unexpected boom"

    def test_internal_error_propagates_source(self):
        err = normalize_error(
            ValueError("weird"),
            source="/tmp/story.yml",
        )
        assert err.source == "/tmp/story.yml"

    def test_custom_exception_uses_class_name(self):
        class _MyError(Exception):
            pass

        err = normalize_error(_MyError("nope"))
        assert err.details["exception_type"] == "_MyError"
        assert err.details["reason"] == "nope"
