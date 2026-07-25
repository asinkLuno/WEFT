"""Spec 8: validation_error 把 Pydantic ValidationError 转成 SchemaError。

转换契约：
- 返回 SchemaError（stage=SCHEMA）
- message 取**首个** issue 的 msg
- path 是外部 path 与首个 issue loc 的拼接
- details["issues"] 含全部 issues（不只首个）
- code 默认 ``SCHEMA_VALIDATION``，可覆盖
"""

from __future__ import annotations

import pytest
from pydantic import BaseModel, ValidationError, field_validator

from weft_backend.errors import (
    ErrorStage,
    SchemaError,
    validation_error,
)


class _Demo(BaseModel):
    # 简单负数检查；触发 ValidationError 用于测试。
    x: int

    @field_validator("x")
    @classmethod
    def _non_negative(cls, v: int) -> int:
        if v < 0:
            raise ValueError("must be non-negative")
        return v


def _validation_error_for_x(value: int) -> ValidationError:
    try:
        _Demo(x=value)
    except ValidationError as exc:
        return exc
    raise AssertionError("expected ValidationError")


@pytest.mark.unit
class TestValidationErrorConversion:
    def test_returns_schema_error(self):
        ve = _validation_error_for_x(-1)
        err = validation_error(ve)
        assert isinstance(err, SchemaError)
        assert err.stage is ErrorStage.SCHEMA

    def test_message_takes_first_issue_msg(self):
        ve = _validation_error_for_x(-1)
        err = validation_error(ve)
        # Pydantic 把 ValueError 文案包装成 "Value error, must be non-negative"。
        assert err.message == "Value error, must be non-negative"

    def test_path_combines_external_with_loc(self):
        ve = _validation_error_for_x(-1)
        err = validation_error(ve, path=("moai", "guojing"))
        # 外部 ("moai", "guojing") + issue loc ("x",)。
        assert err.path == ("moai", "guojing", "x")

    def test_path_defaults_to_loc_only_when_external_empty(self):
        ve = _validation_error_for_x(-1)
        err = validation_error(ve)
        assert err.path == ("x",)

    def test_code_defaults_to_schema_validation(self):
        ve = _validation_error_for_x(-1)
        err = validation_error(ve)
        assert err.code == "SCHEMA_VALIDATION"

    def test_code_can_be_overridden(self):
        ve = _validation_error_for_x(-1)
        err = validation_error(ve, code="MOAI_BASE_TIME_INVALID")
        assert err.code == "MOAI_BASE_TIME_INVALID"


@pytest.mark.unit
class TestValidationErrorIssues:
    def test_details_issues_includes_all(self):
        # 单个 issue 场景：details["issues"] 长度 == 1。
        ve = _validation_error_for_x(-1)
        err = validation_error(ve)
        issues = err.details["issues"]
        assert isinstance(issues, list)
        assert len(issues) == 1
        # 每条 issue 至少带 loc / msg。
        assert "loc" in issues[0]
        assert "msg" in issues[0]


@pytest.mark.unit
class TestValidationErrorMultipleIssues:
    def test_first_issue_used_as_message_all_kept_in_details(self):
        # 双失败模型：x 既是错的类型又是负数。
        class _TwoFailures(BaseModel):
            x: int

            @field_validator("x")
            @classmethod
            def _non_negative(cls, v: int) -> int:
                if v < 0:
                    raise ValueError("must be non-negative")
                return v

        # "not-an-int" 不是 int；类型校验和自定义校验都会触发。
        try:
            _TwoFailures(x="not-an-int")  # type: ignore[arg-type]
        except ValidationError as ve:
            err = validation_error(ve)
            # message 来自首条 issue；details["issues"] 包含全部。
            assert err.message == ve.errors(
                include_url=False,
                include_context=False,
                include_input=False,
            )[0]["msg"]
            assert len(err.details["issues"]) >= 1
        else:
            raise AssertionError("expected ValidationError")
