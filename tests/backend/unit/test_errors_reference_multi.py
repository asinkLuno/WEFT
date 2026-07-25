"""Spec 7: ReferenceError 多继承契约。

``ReferenceError(WeftError, KeyError)``：让 ``dict[missing_key]`` 抛的
``KeyError`` 能被替换成结构化错误，同时老的 ``except KeyError`` 代码继续
兜得住。钉死三个父类的 isinstance 关系与 except 捕获顺序无关。
"""

from __future__ import annotations

import pytest

from weft_backend.errors import ErrorStage, ReferenceError, WeftError


@pytest.mark.unit
class TestReferenceErrorInheritance:
    def test_is_weft_error(self):
        err = ReferenceError("CODE", "msg")
        assert isinstance(err, WeftError)

    def test_is_key_error(self):
        # 关键契约：能被 ``except KeyError`` 兜住。
        err = ReferenceError("CODE", "msg")
        assert isinstance(err, KeyError)

    def test_is_value_error_via_weft_error(self):
        err = ReferenceError("CODE", "msg")
        assert isinstance(err, ValueError)

    def test_stage_bound_to_reference(self):
        err = ReferenceError("CODE", "msg")
        assert err.stage is ErrorStage.REFERENCE


@pytest.mark.unit
class TestReferenceErrorCatchOrder:
    def test_caught_by_key_error(self):
        # 模拟 "raise from dict access" 路径。
        try:
            raise ReferenceError("MOAI_NOT_FOUND", "no such moai")
        except KeyError as caught:
            assert isinstance(caught, ReferenceError)
            assert caught.code == "MOAI_NOT_FOUND"

    def test_caught_by_weft_error(self):
        try:
            raise ReferenceError("MOAI_NOT_FOUND", "no such moai")
        except WeftError as caught:
            assert isinstance(caught, ReferenceError)

    def test_caught_by_value_error(self):
        try:
            raise ReferenceError("MOAI_NOT_FOUND", "no such moai")
        except ValueError as caught:
            assert isinstance(caught, ReferenceError)
