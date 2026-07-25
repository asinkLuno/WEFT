"""后端测试共享 fixture。

放在 ``tests/backend/`` 下，作用域仅覆盖本目录树；后续 ``tests/e2e/`` 进来
（Playwright）不会受 autouse 注册表重置影响。
"""

from __future__ import annotations

import textwrap
from collections.abc import Callable, Mapping
from pathlib import Path
from typing import Any

import pytest
import yaml

from weft_backend.aqueduct import AQUEDUCTS, _BUILTIN_AQUEDUCTS
from weft_backend.material import MATERIALS, _BUILTIN_MATERIALS


@pytest.fixture
def write_yaml(tmp_path: Path) -> Callable[..., Path]:
    """返回一个工厂：把 dict 或 raw string 写成 tmp_path 下的文件。

    ``data`` 为 dict 时按后缀挑序列化器（yaml/json/toml），避免每个测试
    文件各自维护一份 ``yaml.dump`` 样板。str 走 ``textwrap.dedent``，与
    原来各文件里的 ``_write`` 行为一致。
    """

    def _write(
        data: Mapping[str, Any] | str,
        name: str = "story.yml",
    ) -> Path:
        path = tmp_path / name
        if isinstance(data, str):
            path.write_text(textwrap.dedent(data), encoding="utf-8")
            return path
        suffix = path.suffix.lower()
        if suffix in {".yaml", ".yml"}:
            payload = yaml.dump(
                data,
                allow_unicode=True,
                sort_keys=False,
                default_flow_style=False,
            )
        elif suffix == ".json":
            payload = json_dumps(data)
        elif suffix == ".toml":
            payload = toml_dumps(data)
        else:
            raise ValueError(f"不支持的测试文件后缀: {suffix}")
        path.write_text(payload, encoding="utf-8")
        return path

    return _write


@pytest.fixture
def write_plugin(tmp_path: Path) -> Callable[..., Path]:
    """返回一个工厂：把 Python 源码 dedent 后写到 ``tmp_path/{name}.py``。"""

    def _write(name: str, source: str) -> Path:
        path = tmp_path / f"{name}.py"
        path.write_text(textwrap.dedent(source), encoding="utf-8")
        return path

    return _write


@pytest.fixture(scope="session")
def examples_dir() -> Path:
    """仓库根的 ``examples/`` 目录，供 e2e 测试访问真实故事文件。"""

    return Path(__file__).resolve().parent.parent.parent / "examples"


@pytest.fixture(autouse=True)
def reset_aqueduct_registry() -> None:
    """每个测试前后重置全局 ``AQUEDUCTS`` 到内置基线。

    用户 aqueduct 插件通过 ``load_dao`` 注入到全局表；不重置会污染后续测试。
    """

    AQUEDUCTS.clear()
    AQUEDUCTS.update(_BUILTIN_AQUEDUCTS)
    yield
    AQUEDUCTS.clear()
    AQUEDUCTS.update(_BUILTIN_AQUEDUCTS)


@pytest.fixture(autouse=True)
def reset_material_registry() -> None:
    """每个测试前后重置全局 ``MATERIALS`` 到内置基线。"""

    MATERIALS.clear()
    MATERIALS.update(_BUILTIN_MATERIALS)
    yield
    MATERIALS.clear()
    MATERIALS.update(_BUILTIN_MATERIALS)


def json_dumps(data: Any) -> str:
    import json

    return json.dumps(data, ensure_ascii=False, indent=2)


def toml_dumps(data: Any) -> str:
    """TOML 没有标准库 writer；测试只用到很浅的结构，手写覆盖足够。

    复杂嵌套场景由 yaml/json 测试覆盖，TOML 仅断言 ``load_dao`` 识别后缀。
    """

    lines: list[str] = []

    def _dump_table(prefix: str, table: Mapping[str, Any]) -> None:
        scalars: list[tuple[str, Any]] = []
        children: list[tuple[str, Any]] = []
        for key, value in table.items():
            if isinstance(value, Mapping):
                children.append((key, value))
            elif isinstance(value, list) and value and all(
                isinstance(item, Mapping) for item in value
            ):
                children.append((key, value))
            else:
                scalars.append((key, value))
        for key, value in scalars:
            lines.append(f"{key} = {_toml_scalar(value)}")
        for key, value in children:
            header = f"{prefix}.{key}" if prefix else key
            if isinstance(value, list):
                for item in value:
                    lines.append(f"[[{header}]]")
                    _dump_table(header, item)
                    lines.append("")
            else:
                lines.append(f"[{header}]")
                _dump_table(header, value)
                lines.append("")

    _dump_table("", data)
    return "\n".join(lines).strip() + "\n"


def _toml_scalar(value: Any) -> str:
    if isinstance(value, str):
        return f'"{value}"'
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, list):
        return "[" + ", ".join(_toml_scalar(item) for item in value) + "]"
    raise TypeError(f"测试 TOML writer 暂不支持 {type(value).__name__}")
