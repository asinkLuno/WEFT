"""Moai material functions — 从 Moai 属性计算出派生属性。"""

import importlib.util
from collections.abc import Callable, Mapping
from pathlib import Path
from typing import Any, Protocol

from weft_backend.aqueduct import Aqueduct, Phase


class MaterialTarget(Protocol):
    name: str
    base_time: Phase | None
    extra_props: dict[str, Any] | None
    aqueduct: Aqueduct


# (start_m, start_d), (end_m, end_d), name
_ZODIAC = (
    ((1, 20), (2, 18), "水瓶座"),
    ((2, 19), (3, 20), "双鱼座"),
    ((3, 21), (4, 19), "白羊座"),
    ((4, 20), (5, 20), "金牛座"),
    ((5, 21), (6, 21), "双子座"),
    ((6, 22), (7, 22), "巨蟹座"),
    ((7, 23), (8, 22), "狮子座"),
    ((8, 23), (9, 22), "处女座"),
    ((9, 23), (10, 23), "天秤座"),
    ((10, 24), (11, 22), "天蝎座"),
    ((11, 23), (12, 21), "射手座"),
    ((12, 22), (1, 19), "摩羯座"),
)


def constellation(moai: MaterialTarget) -> str:
    """从 Moai 的 base_time 计算星座。"""

    if moai.base_time is None:
        return "未知"
    flat = moai.aqueduct.de_recursive(moai.base_time)
    month, day = flat[1], flat[2]
    for (sm, sd), (em, ed), name in _ZODIAC:
        if (month == sm and day >= sd) or (month == em and day <= ed):
            return name
    return "摩羯座"  # ponytail: unreachable, pacifies type checkers


# 注册表: 名称 → 计算函数
MATERIALS: dict[str, Callable[[MaterialTarget], Any]] = {
    "constellation": constellation,
}

# 内置 material 基线快照 —— load_user_materials 每次先重置到此再叠加用户插件,
# 保证热重载或换文件时不会残留上一次的用户注册。
_BUILTIN_MATERIALS: dict[str, Callable[[MaterialTarget], Any]] = dict(MATERIALS)


def load_user_materials(spec: object, base_dir: Path) -> None:
    """按 YAML 顶层 ``material`` 映射（注册名 → .py 路径）加载用户插件。

    每个插件文件须暴露固定入口 ``def material(moai)``，只用标准库。注册名即
    moai ``materials`` 引用的名字，可覆盖内置 material。路径相对 *base_dir*
    解析（也支持绝对路径）。失败时抛 ``ValueError``，让 ``load_dao`` 中止。
    """

    # 先重置到内置基线，原地 mutate（不重新赋值）以保 dao.py 的 import 引用有效。
    MATERIALS.clear()
    MATERIALS.update(_BUILTIN_MATERIALS)

    if spec is None:
        return
    if not isinstance(spec, Mapping):
        raise ValueError("顶层 material 必须是「注册名: 文件路径」的映射")

    for name, raw_path in spec.items():
        if not isinstance(name, str):
            raise ValueError(
                f"material 注册名必须是字符串, 得到 {type(name).__name__}"
            )
        if not isinstance(raw_path, str):
            raise ValueError(
                f"material 插件 {name!r} 的路径必须是字符串, 得到 {type(raw_path).__name__}"
            )

        path = Path(raw_path)
        if not path.is_absolute():
            path = base_dir / path
        if not path.is_file():
            raise ValueError(
                f"material 插件文件不存在: {raw_path!r} (解析为 {path})"
            )

        try:
            module = _load_plugin_module(path, name)
        except Exception as exc:  # 包装任意用户脚本异常 (SyntaxError / 运行时)
            raise ValueError(
                f"material 插件 {name!r} ({path}) 加载失败: {exc}"
            ) from exc

        fn = getattr(module, "material", None)
        if not callable(fn):
            raise ValueError(
                f"material 插件 {name!r} ({path}) 缺少固定入口函数 material(moai)"
            )
        MATERIALS[name] = fn


def _load_plugin_module(path: Path, name: str) -> object:
    """用 importlib 从文件路径加载插件模块，每次返回全新对象（不缓存）。"""

    module_name = f"_weft_user_material__{name}"
    spec = importlib.util.spec_from_file_location(module_name, path)
    assert spec is not None and spec.loader is not None  # .py 文件必有 spec
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module
