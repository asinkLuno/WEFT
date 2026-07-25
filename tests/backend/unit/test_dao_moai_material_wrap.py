"""Spec 10: Moai.from_dict 把 material 计算异常包成 PluginError。

``apply_material`` 可能抛两类异常：
- ``WeftError`` 子类（如 ``MATERIAL_NOT_FOUND``）：透传，让上游按结构化错误处理。
- 其它 ``Exception``（用户插件 bug）：包装成 ``PluginError`` ``MATERIAL_EVALUATION_FAILED``，
  ``details`` 钉死 ``exception_type`` 与 ``reason`` 方便定位。

测试用 ``MATERIALS`` 注册临时 stub；conftest 的 autouse fixture 保证不污染其它用例。
"""

from __future__ import annotations

import pytest

from weft_backend.aqueduct import gregorian_aqueduct
from weft_backend.dao import Moai
from weft_backend.errors import PluginError, ReferenceError, WeftError
from weft_backend.material import MATERIALS


def _make_failing_material(exc_factory):
    """注册一个总是抛指定异常的 material，返回注册名。"""

    def _fn(_moai):  # type: ignore[no-untyped-def]
        raise exc_factory()

    name = "_test_always_fails"
    MATERIALS[name] = _fn
    return name


@pytest.mark.unit
class TestMoaiFromDictMaterialWrap:
    def test_value_error_wrapped_as_plugin_error(self):
        name = _make_failing_material(lambda: ValueError("boom"))
        with pytest.raises(PluginError) as exc_info:
            Moai.from_dict(
                "guojing",
                {"description": "D", "materials": [name]},
                gregorian_aqueduct,
            )
        err = exc_info.value
        assert err.code == "MATERIAL_EVALUATION_FAILED"
        assert err.path == ("moai", "guojing", "materials")
        assert err.details["exception_type"] == "ValueError"
        assert err.details["reason"] == "boom"

    def test_runtime_error_wrapped_as_plugin_error(self):
        name = _make_failing_material(lambda: RuntimeError("unexpected"))
        with pytest.raises(PluginError) as exc_info:
            Moai.from_dict(
                "guojing",
                {"description": "D", "materials": [name]},
                gregorian_aqueduct,
            )
        assert exc_info.value.code == "MATERIAL_EVALUATION_FAILED"
        assert exc_info.value.details["exception_type"] == "RuntimeError"

    def test_weft_error_passes_through_unwrapped(self):
        # WeftError 已经是结构化错误；不应被包成 PluginError。
        def _fn(_moai):
            raise ReferenceError(
                "CUSTOM_REF",
                "custom",
                path=("custom",),
            )

        MATERIALS["_test_ref"] = _fn
        with pytest.raises(ReferenceError) as exc_info:
            Moai.from_dict(
                "guojing",
                {"description": "D", "materials": ["_test_ref"]},
                gregorian_aqueduct,
            )
        # 关键：code 不应被改成 MATERIAL_EVALUATION_FAILED。
        assert exc_info.value.code == "CUSTOM_REF"
        # isinstance 检查：ReferenceError 也是 WeftError 子类。
        assert isinstance(exc_info.value, WeftError)
        assert not isinstance(exc_info.value, PluginError)

    def test_plugin_error_chains_from_original(self):
        # ``raise ... from exc`` —— __cause__ 指向原始异常，traceback 不丢。
        name = _make_failing_material(lambda: ValueError("root"))
        with pytest.raises(PluginError) as exc_info:
            Moai.from_dict(
                "guojing",
                {"description": "D", "materials": [name]},
                gregorian_aqueduct,
            )
        assert isinstance(exc_info.value.__cause__, ValueError)
        assert str(exc_info.value.__cause__) == "root"


@pytest.mark.unit
class TestMoaiFromDictMaterialMerge:
    def test_computed_values_merge_into_extra_props(self):
        # 正向路径：material 计算结果合并进 extra_props，已有的 extra_props 保留。
        def _stub(_moai):
            return "stub-value"

        MATERIALS["_test_stub"] = _stub
        moai = Moai.from_dict(
            "guojing",
            {
                "description": "D",
                "materials": ["_test_stub"],
                "race": "tiefling",  # 已有 extra_props
            },
            gregorian_aqueduct,
        )
        assert moai.extra_props == {
            "race": "tiefling",
            "_test_stub": "stub-value",
        }
