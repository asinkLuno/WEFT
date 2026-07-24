"""Structured errors shared by file loaders, the desktop app, and MCP."""

from __future__ import annotations

import json
import tomllib
from enum import StrEnum
from pathlib import Path
from typing import Any

import yaml
from pydantic import ValidationError

ErrorPath = tuple[str | int, ...]


class ErrorStage(StrEnum):
    FILE = "file"
    PARSE = "parse"
    SCHEMA = "schema"
    REFERENCE = "reference"
    TIMELINE = "timeline"
    PLUGIN = "plugin"
    STATE = "state"
    INTERNAL = "internal"


def format_error_path(path: ErrorPath) -> str:
    """Render a model path in a form shared with YAML/JSON diagnostics."""

    result = ""
    for part in path:
        if isinstance(part, int):
            result += f"[{part}]"
        elif not result:
            result = part
        else:
            result += f".{part}"
    return result


class WeftError(ValueError):
    """A stable, serializable error suitable for both humans and agents."""

    def __init__(
        self,
        code: str,
        message: str,
        *,
        stage: ErrorStage,
        path: ErrorPath = (),
        source: str | Path | None = None,
        line: int | None = None,
        column: int | None = None,
        hint: str | None = None,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.stage = stage
        self.path = path
        self.source = str(source) if source is not None else None
        self.line = line
        self.column = column
        self.hint = hint
        self.details = details or {}

    def attach_source(self, source: str | Path) -> WeftError:
        if self.source is None:
            self.source = str(source)
        return self

    def to_dict(self) -> dict[str, object]:
        result: dict[str, object] = {
            "code": self.code,
            "stage": self.stage.value,
            "message": self.message,
        }
        if self.source is not None:
            result["source"] = self.source
        if self.path:
            result["path"] = list(self.path)
            result["path_display"] = format_error_path(self.path)
        if self.line is not None:
            result["line"] = self.line
        if self.column is not None:
            result["column"] = self.column
        if self.hint is not None:
            result["hint"] = self.hint
        if self.details:
            result["details"] = self.details
        return result

    def __str__(self) -> str:
        location = self.source or ""
        if self.line is not None:
            location += f":{self.line}"
            if self.column is not None:
                location += f":{self.column}"
        path = format_error_path(self.path)
        prefix = f"{location}: " if location else ""
        if path:
            prefix += f"{path}: "
        return f"{prefix}{self.message} [{self.code}]"


class FileError(WeftError):
    def __init__(self, code: str, message: str, **kwargs: Any) -> None:
        super().__init__(code, message, stage=ErrorStage.FILE, **kwargs)


class ParseError(WeftError):
    def __init__(self, code: str, message: str, **kwargs: Any) -> None:
        super().__init__(code, message, stage=ErrorStage.PARSE, **kwargs)


class SchemaError(WeftError):
    def __init__(self, code: str, message: str, **kwargs: Any) -> None:
        super().__init__(code, message, stage=ErrorStage.SCHEMA, **kwargs)


class ReferenceError(WeftError, KeyError):
    def __init__(self, code: str, message: str, **kwargs: Any) -> None:
        super().__init__(code, message, stage=ErrorStage.REFERENCE, **kwargs)


class TimelineError(WeftError):
    def __init__(self, code: str, message: str, **kwargs: Any) -> None:
        super().__init__(code, message, stage=ErrorStage.TIMELINE, **kwargs)


class PluginError(WeftError):
    def __init__(self, code: str, message: str, **kwargs: Any) -> None:
        super().__init__(code, message, stage=ErrorStage.PLUGIN, **kwargs)


class StateError(WeftError):
    def __init__(self, code: str, message: str, **kwargs: Any) -> None:
        super().__init__(code, message, stage=ErrorStage.STATE, **kwargs)


def validation_error(
    exc: ValidationError,
    *,
    path: ErrorPath = (),
    code: str = "SCHEMA_VALIDATION",
) -> SchemaError:
    """Convert the first Pydantic issue while retaining all issues as details."""

    issues = exc.errors(
        include_url=False,
        include_context=False,
        include_input=False,
    )
    first = issues[0]
    issue_path = path + tuple(first.get("loc", ()))
    return SchemaError(
        code,
        first["msg"],
        path=issue_path,
        details={"issues": issues},
    )


def normalize_error(exc: Exception, source: str | Path | None = None) -> WeftError:
    """Convert library and OS exceptions at the story-loading boundary."""

    if isinstance(exc, WeftError):
        if source is not None:
            exc.attach_source(source)
            _attach_yaml_location(exc, Path(source))
        return exc

    if isinstance(exc, FileNotFoundError):
        return FileError(
            "FILE_NOT_FOUND",
            "故事文件不存在",
            source=source or exc.filename,
        )
    if isinstance(exc, PermissionError):
        return FileError(
            "FILE_PERMISSION_DENIED",
            "没有权限读取故事文件",
            source=source or exc.filename,
        )
    if isinstance(exc, UnicodeDecodeError):
        return ParseError(
            "TEXT_ENCODING",
            "故事文件必须使用 UTF-8 编码",
            source=source,
            details={"encoding": exc.encoding, "offset": exc.start},
        )
    if isinstance(exc, yaml.MarkedYAMLError):
        mark = exc.problem_mark
        return ParseError(
            "YAML_SYNTAX",
            exc.problem or "YAML 语法错误",
            source=source,
            line=mark.line + 1 if mark is not None else None,
            column=mark.column + 1 if mark is not None else None,
            details={"context": exc.context} if exc.context else None,
        )
    if isinstance(exc, json.JSONDecodeError):
        return ParseError(
            "JSON_SYNTAX",
            exc.msg,
            source=source,
            line=exc.lineno,
            column=exc.colno,
        )
    if isinstance(exc, tomllib.TOMLDecodeError):
        return ParseError(
            "TOML_SYNTAX",
            str(exc),
            source=source,
        )
    if isinstance(exc, ValidationError):
        error = validation_error(exc)
        if source is not None:
            error.attach_source(source)
        return error

    return WeftError(
        "INTERNAL_ERROR",
        "加载故事时发生未预期错误",
        stage=ErrorStage.INTERNAL,
        source=source,
        details={"exception_type": type(exc).__name__, "reason": str(exc)},
    )


def _attach_yaml_location(error: WeftError, source: Path) -> None:
    """Locate a semantic error path without slowing successful YAML loads."""

    if error.line is not None or source.suffix.lower() not in {".yaml", ".yml"}:
        return
    try:
        with source.open(encoding="utf-8") as fh:
            root = yaml.compose(fh, Loader=getattr(yaml, "CSafeLoader", yaml.SafeLoader))
    except Exception:
        return
    if root is None:
        return

    locations: dict[ErrorPath, tuple[int, int]] = {}

    def visit(node: yaml.Node, path: ErrorPath) -> None:
        locations[path] = (node.start_mark.line + 1, node.start_mark.column + 1)
        if isinstance(node, yaml.MappingNode):
            for key_node, value_node in node.value:
                if not isinstance(key_node, yaml.ScalarNode):
                    continue
                visit(value_node, path + (key_node.value,))
        elif isinstance(node, yaml.SequenceNode):
            for index, item in enumerate(node.value):
                visit(item, path + (index,))

    visit(root, ())
    candidate = error.path
    while candidate not in locations and candidate:
        candidate = candidate[:-1]
    location = locations.get(candidate)
    if location is not None:
        error.line, error.column = location
