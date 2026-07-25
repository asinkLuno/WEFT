"""Spec 9: normalize_error 对内置 / 库异常的分派。

``normalize_error`` 是故事加载边界的「翻译器」——把 Python 标准库与 PyYAML /
json / tomllib 抛的异常翻译成稳定的 WeftError 子类。本文件钉死**不摸文件系统**
的分派分支；YAML 行号定位（``_attach_yaml_location``）与 ``yaml.MarkedYAMLError``
分支留给 integration，因为它们需要真实 YAML 文件。
"""

from __future__ import annotations

import json
import tomllib

import pytest

from weft_backend.errors import (
    ErrorStage,
    FileError,
    ParseError,
    SchemaError,
    WeftError,
    normalize_error,
)


@pytest.mark.unit
class TestNormalizeFileErrors:
    def test_file_not_found_error(self):
        # exc.filename 可以是 None；这里显式传 source。
        exc = FileNotFoundError(2, "No such file", "/tmp/missing.yml")
        err = normalize_error(exc, source="/tmp/missing.yml")
        assert isinstance(err, FileError)
        assert err.code == "FILE_NOT_FOUND"
        assert err.stage is ErrorStage.FILE
        assert err.source == "/tmp/missing.yml"

    def test_file_not_found_falls_back_to_exc_filename_when_source_none(self):
        exc = FileNotFoundError(2, "No such file")
        exc.filename = "/tmp/missing.yml"
        err = normalize_error(exc)
        assert err.source == "/tmp/missing.yml"

    def test_permission_error(self):
        exc = PermissionError("denied")
        exc.filename = "/tmp/secret.yml"
        err = normalize_error(exc, source="/tmp/secret.yml")
        assert isinstance(err, FileError)
        assert err.code == "FILE_PERMISSION_DENIED"
        assert err.stage is ErrorStage.FILE


@pytest.mark.unit
class TestNormalizeParseErrors:
    def test_unicode_decode_error(self):
        # UTF-8 解码失败：构造一个真实的 UnicodeDecodeError。
        try:
            b"\xff\x00".decode("utf-8")
        except UnicodeDecodeError as exc:
            err = normalize_error(exc, source="story.yml")
            assert isinstance(err, ParseError)
            assert err.code == "TEXT_ENCODING"
            assert err.stage is ErrorStage.PARSE
            assert err.source == "story.yml"
            assert err.details["encoding"] == "utf-8"
            assert err.details["offset"] == exc.start
            return
        raise AssertionError("expected UnicodeDecodeError")

    def test_json_decode_error(self):
        try:
            json.loads("{not json}")
        except json.JSONDecodeError as exc:
            err = normalize_error(exc, source="story.json")
            assert isinstance(err, ParseError)
            assert err.code == "JSON_SYNTAX"
            assert err.stage is ErrorStage.PARSE
            assert err.source == "story.json"
            assert err.line == exc.lineno
            assert err.column == exc.colno
            return
        raise AssertionError("expected JSONDecodeError")

    def test_toml_decode_error(self):
        try:
            tomllib.loads("invalid = 'unterminated")
        except tomllib.TOMLDecodeError as exc:
            err = normalize_error(exc, source="story.toml")
            assert isinstance(err, ParseError)
            assert err.code == "TOML_SYNTAX"
            assert err.stage is ErrorStage.PARSE
            assert err.source == "story.toml"
            assert err.message == str(exc)
            return
        raise AssertionError("expected TOMLDecodeError")


@pytest.mark.unit
class TestNormalizeSchemaErrors:
    def test_pydantic_validation_error_routes_through_validation_error(self):
        # ValidationError 走 validation_error 路径，返回 SchemaError。
        from pydantic import BaseModel, ValidationError

        class M(BaseModel):
            x: int

        try:
            M(x="not int")  # type: ignore[arg-type]
        except ValidationError as exc:
            err = normalize_error(exc, source="story.yml")
            assert isinstance(err, SchemaError)
            assert err.stage is ErrorStage.SCHEMA
            assert err.source == "story.yml"
            return
        raise AssertionError("expected ValidationError")
