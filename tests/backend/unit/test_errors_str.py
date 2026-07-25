"""Spec 5: WeftError.__str__ 拼接规则。

格式：``[source[:line[:column]]: ][path_display: ]message [code]``。
所有可选段缺失时不留多余分隔符；``column`` 只在 ``line`` 也设了的时候才
渲染（嵌套 if 的契约）。
"""

from __future__ import annotations

import pytest

from weft_backend.errors import ErrorStage, WeftError


@pytest.mark.unit
class TestWeftErrorStr:
    def test_bare_error_message_and_code(self):
        err = WeftError("CODE", "msg", stage=ErrorStage.INTERNAL)
        assert str(err) == "msg [CODE]"

    def test_source_prefix(self):
        err = WeftError("CODE", "msg", stage=ErrorStage.FILE, source="story.yml")
        assert str(err) == "story.yml: msg [CODE]"

    def test_source_and_line_prefix(self):
        err = WeftError(
            "CODE",
            "msg",
            stage=ErrorStage.PARSE,
            source="story.yml",
            line=10,
        )
        assert str(err) == "story.yml:10: msg [CODE]"

    def test_source_line_column_prefix(self):
        err = WeftError(
            "CODE",
            "msg",
            stage=ErrorStage.PARSE,
            source="story.yml",
            line=10,
            column=5,
        )
        assert str(err) == "story.yml:10:5: msg [CODE]"

    def test_path_prefix_without_source(self):
        err = WeftError(
            "CODE",
            "msg",
            stage=ErrorStage.SCHEMA,
            path=("moai", "x"),
        )
        assert str(err) == "moai.x: msg [CODE]"

    def test_source_and_path_combine(self):
        err = WeftError(
            "CODE",
            "msg",
            stage=ErrorStage.SCHEMA,
            source="story.yml",
            path=("moai", "x"),
        )
        assert str(err) == "story.yml: moai.x: msg [CODE]"

    def test_full_prefix_chain(self):
        err = WeftError(
            "CODE",
            "msg",
            stage=ErrorStage.SCHEMA,
            source="story.yml",
            line=10,
            column=5,
            path=("moai", "x", 0, "base_time"),
        )
        assert str(err) == "story.yml:10:5: moai.x[0].base_time: msg [CODE]"

    def test_column_without_line_is_dropped(self):
        # column 嵌套在 line 的 if 里；line=None 时 column 不渲染。
        # 这是当前契约——若想改为支持「column-only」需要重写 __str__。
        err = WeftError(
            "CODE",
            "msg",
            stage=ErrorStage.PARSE,
            source="story.yml",
            column=5,
        )
        assert str(err) == "story.yml: msg [CODE]"
