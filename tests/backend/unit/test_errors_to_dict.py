"""Spec 4: WeftError.to_dict 字段排除规则。

``to_dict`` 是跨进程序列化的契约（前端 / MCP / 日志），写出来的 dict 必须
不包含 ``None`` 或空容器字段——消费方按 key 存在性判断而不是 ``None``。
钉死：必出 code/stage/message；其它字段按非空出现；stage 永远是字符串值。
"""

from __future__ import annotations

import pytest

from weft_backend.errors import ErrorStage, WeftError


@pytest.mark.unit
class TestToDictRequiredKeys:
    def test_minimal_error_has_only_three_keys(self):
        err = WeftError("CODE", "msg", stage=ErrorStage.INTERNAL)
        d = err.to_dict()
        assert set(d.keys()) == {"code", "stage", "message"}
        assert d["code"] == "CODE"
        assert d["stage"] == "internal"  # StrEnum -> .value
        assert d["message"] == "msg"

    def test_stage_always_serializes_to_value_string(self):
        # 8 个 stage 都该出字符串值，不是 "ErrorStage.FILE" 这种。
        for stage in ErrorStage:
            err = WeftError("CODE", "msg", stage=stage)
            assert err.to_dict()["stage"] == stage.value


@pytest.mark.unit
class TestToDictOptionalKeys:
    def test_source_key_only_when_set(self):
        err = WeftError("CODE", "msg", stage=ErrorStage.FILE, source="story.yml")
        assert err.to_dict().get("source") == "story.yml"

    def test_source_omitted_when_none(self):
        err = WeftError("CODE", "msg", stage=ErrorStage.FILE)
        assert "source" not in err.to_dict()

    def test_line_and_column_keys_emitted_independently(self):
        # line 单独设：只有 line 出现，column 不写。
        err = WeftError("CODE", "msg", stage=ErrorStage.PARSE, line=10)
        d = err.to_dict()
        assert d.get("line") == 10
        assert "column" not in d

    def test_column_key_only_when_set(self):
        err = WeftError("CODE", "msg", stage=ErrorStage.PARSE, column=5)
        d = err.to_dict()
        assert d.get("column") == 5
        assert "line" not in d

    def test_hint_key_only_when_set(self):
        err = WeftError("CODE", "msg", stage=ErrorStage.SCHEMA, hint="check the YAML header")
        assert err.to_dict().get("hint") == "check the YAML header"

    def test_hint_omitted_when_none(self):
        err = WeftError("CODE", "msg", stage=ErrorStage.SCHEMA)
        assert "hint" not in err.to_dict()

    def test_path_pair_emitted_together(self):
        # 非空 path 同时输出 list 形式与渲染字符串；消费方按需取。
        err = WeftError(
            "CODE",
            "msg",
            stage=ErrorStage.SCHEMA,
            path=("moai", "guojing", 0, "base_time"),
        )
        d = err.to_dict()
        assert d.get("path") == ["moai", "guojing", 0, "base_time"]
        assert d.get("path_display") == "moai.guojing[0].base_time"

    def test_path_pair_omitted_when_empty(self):
        err = WeftError("CODE", "msg", stage=ErrorStage.SCHEMA)
        d = err.to_dict()
        assert "path" not in d
        assert "path_display" not in d

    def test_details_key_only_when_non_empty(self):
        err = WeftError(
            "CODE",
            "msg",
            stage=ErrorStage.INTERNAL,
            details={"k": "v"},
        )
        assert err.to_dict().get("details") == {"k": "v"}

    def test_details_omitted_when_empty(self):
        # ``if self.details`` 把空 dict 也排除掉，跟 None 等价。
        err = WeftError("CODE", "msg", stage=ErrorStage.INTERNAL, details={})
        assert "details" not in err.to_dict()


@pytest.mark.unit
class TestToDictAllFields:
    def test_all_optional_fields_set(self):
        err = WeftError(
            "CODE",
            "msg",
            stage=ErrorStage.SCHEMA,
            source="story.yml",
            line=10,
            column=5,
            hint="fix indentation",
            path=("moai", "x"),
            details={"k": "v"},
        )
        d = err.to_dict()
        assert d == {
            "code": "CODE",
            "stage": "schema",
            "message": "msg",
            "source": "story.yml",
            "path": ["moai", "x"],
            "path_display": "moai.x",
            "line": 10,
            "column": 5,
            "hint": "fix indentation",
            "details": {"k": "v"},
        }
