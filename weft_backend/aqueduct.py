from __future__ import annotations

import importlib.util
from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass
from pathlib import Path
from sys import maxsize
from typing import Literal

from pydantic import BaseModel

from weft_backend.errors import PluginError


@dataclass(frozen=True, slots=True)
class Brick:
    name: str
    get_limit: Callable[[Mapping[str, int]], int]


@dataclass(frozen=True, slots=True)
class AqueductMetadata:
    title: str
    description: str = ""


class CalendarMetadata(BaseModel):
    name: str
    title: str
    description: str
    units: list[str]
    source: Literal["builtin", "plugin"]


class Aqueduct:
    def __init__(
        self,
        bricks: list[Brick],
        to_tick: Callable[[list[int]], int] | None = None,
        humanizer: Callable[[Sequence[int], Sequence[Brick]], str] | None = None,
        metadata: AqueductMetadata | None = None,
    ):
        self.bricks = bricks
        self._to_tick = to_tick
        self._humanizer = humanizer
        self.metadata = metadata

    def validate_time_unit(self, value: object) -> None:
        """检查是否为合法的 time_unit，不合法则抛出 ValueError。"""
        if not isinstance(value, Sequence) or isinstance(value, (str, bytes)):
            raise ValueError(f"期望整数序列，实际类型: {type(value).__name__}")
        if len(value) != len(self.bricks):
            raise ValueError(f"长度应为 {len(self.bricks)}，实际: {len(value)}")
        if not all(type(x) is int for x in value):
            raise ValueError(f"元素应全为 int，实际: {value}")

    def normalize(self, values: Sequence[int]) -> list[int]:
        self.validate_time_unit(values)

        c = 0
        result = []
        brick_values = {
            brick.name: value for brick, value in zip(self.bricks, values, strict=True)
        }
        for brick in reversed(self.bricks):
            v = brick_values[brick.name] + c
            limit = brick.get_limit(brick_values)
            # ponytail: when month is out of range (e.g. negative), days get
            # maxsize and can't borrow. Fall back to 31. Only for 日 — 年 is
            # intentionally unbounded (negative years are valid).
            if v < 0 and limit == maxsize and brick.name == "日":
                limit = 31
            # v == limit 是合法边界（12 月、1 月 31 日、24 时、60 分/秒），
            # 不应进位——否则 humanize 会丢月份/日份。只在严格越界时进/借位。
            if limit != maxsize and (v > limit or v < 0):
                c = v // limit
                v = v % limit
            else:
                c = 0
            result.append(v)

        return result[::-1]

    def humanize(self, values: Sequence[int]) -> str:
        """转为人类可读的字符串。"""
        self.validate_time_unit(values)
        if self._humanizer is not None:
            return self._humanizer(values, self.bricks)
        if not any(values):
            return "0年0月0日"
        return "".join(
            f"{value}{brick.name}"
            for brick, value in zip(self.bricks, values, strict=True)
            if value
        )

    def plus(self, tu1: Sequence[int], tu2: Sequence[int]) -> list[int]:
        self.validate_time_unit(tu1)
        self.validate_time_unit(tu2)
        return [i + j for i, j in zip(tu1, tu2, strict=True)]

    def minus(self, tu1: Sequence[int], tu2: Sequence[int]) -> list[int]:
        self.validate_time_unit(tu1)
        self.validate_time_unit(tu2)
        # ponytail: negative components are fine — caller normalizes after
        return [i - j for i, j in zip(tu1, tu2, strict=True)]

    def de_recursive(self, phase: Phase) -> list[int]:
        result = phase.base_time
        ref = phase.ref_time
        while ref is not None:
            if isinstance(ref, Phase):
                result = self.plus(result, ref.base_time)
                ref = ref.ref_time
            else:
                result = self.plus(result, ref)
                ref = None
        return result

    def cmp_flat(self, a: list[int], b: list[int]) -> int:
        """逐位比较两个展平后的时间列表。返回 -1, 0, 1。"""
        for x, y in zip(a, b, strict=True):
            if x < y:
                return -1
            if x > y:
                return 1
        return 0

    def to_tick(self, values: Sequence[int]) -> int:
        """Convert an absolute time to this aqueduct's smallest-unit coordinate."""
        self.validate_time_unit(values)
        if self._to_tick is None:
            raise NotImplementedError("this aqueduct does not define a tick conversion")
        return self._to_tick(list(values))

    def distance(self, start: Sequence[int], end: Sequence[int]) -> int:
        """Return the distance from start to end in the smallest time unit."""
        return self.to_tick(end) - self.to_tick(start)


def get_days_in_month(ctx: Mapping[str, int]) -> int:
    def is_leap_year(year: int) -> bool:
        return (year % 4 == 0 and year % 100 != 0) or (year % 400 == 0)

    month = ctx["月"]
    year = ctx["年"]
    if month in {1, 3, 5, 7, 8, 10, 12}:
        return 31
    if month in {4, 6, 9, 11}:
        return 30
    if month == 2:
        return 29 if is_leap_year(year) else 28
    # ponytail: offset-only phases carry M=0 (e.g. "10 years"); no month →
    # day can't carry, return maxsize so normalize skips it.
    return maxsize


def gregorian_to_tick(values: list[int]) -> int:
    """Return proleptic-Gregorian seconds for an absolute time.

    The coordinate uses astronomical year numbering and intentionally has no
    Unix-epoch dependency. Out-of-range components are carried naturally, so
    resolved relative phases such as month 14 or hour -1 remain representable.
    """
    year, month, day, hour, minute, second = values

    year_carry, month_index = divmod(month - 1, 12)
    year += year_carry
    month = month_index + 1

    day_carry, seconds_in_day = divmod(hour * 3600 + minute * 60 + second, 86400)

    # Howard Hinnant's civil-date conversion, adapted to Python's floor
    # division. Its arbitrary origin is irrelevant: only tick differences are
    # exposed to timeline consumers.
    adjusted_year = year - (1 if month <= 2 else 0)
    era = adjusted_year // 400
    year_of_era = adjusted_year - era * 400
    shifted_month = month + (-3 if month > 2 else 9)
    day_of_year = (153 * shifted_month + 2) // 5
    day_of_era = year_of_era * 365 + year_of_era // 4 - year_of_era // 100 + day_of_year
    days = era * 146097 + day_of_era + day - 1 + day_carry

    return days * 86400 + seconds_in_day


gregorian_aqueduct = Aqueduct(
    [
        Brick("年", get_limit=lambda ctx: maxsize),
        Brick("月", get_limit=lambda ctx: 12),
        Brick("日", get_limit=get_days_in_month),
        Brick("时", get_limit=lambda ctx: 24),
        Brick("分", get_limit=lambda ctx: 60),
        Brick("秒", get_limit=lambda ctx: 60),
    ],
    to_tick=gregorian_to_tick,
    metadata=AqueductMetadata(
        title="格里高利历",
        description="采用年、月、日和时分秒表示时间，并包含公历闰年规则。",
    ),
)


_ENGLISH_UNITS = {
    "年": ("year", "years"),
    "月": ("month", "months"),
    "日": ("day", "days"),
    "时": ("hour", "hours"),
    "分": ("minute", "minutes"),
    "秒": ("second", "seconds"),
}


def humanize_english_gregorian(
    values: Sequence[int], bricks: Sequence[Brick]
) -> str:
    """Render Gregorian components using English unit names."""

    if not any(values):
        return "0 years, 0 months, 0 days"
    parts = []
    for brick, value in zip(bricks, values, strict=True):
        if value:
            singular, plural = _ENGLISH_UNITS[brick.name]
            parts.append(f"{value} {singular if abs(value) == 1 else plural}")
    return ", ".join(parts)


gregorian_en_aqueduct = Aqueduct(
    gregorian_aqueduct.bricks,
    to_tick=gregorian_to_tick,
    humanizer=humanize_english_gregorian,
    metadata=AqueductMetadata(
        title="Gregorian Calendar",
        description=(
            "Represents time with years, months, days, hours, minutes, and seconds."
        ),
    ),
)


# Registry name -> calendar implementation. User plugins may override built-ins.
AQUEDUCTS: dict[str, Aqueduct] = {
    "gregorian": gregorian_aqueduct,
    "gregorian_en": gregorian_en_aqueduct,
}
_BUILTIN_AQUEDUCTS: dict[str, Aqueduct] = dict(AQUEDUCTS)


def calendar_metadata_for(name: str) -> CalendarMetadata:
    aqueduct = AQUEDUCTS[name]
    metadata = aqueduct.metadata
    source: Literal["builtin", "plugin"] = (
        "builtin" if _BUILTIN_AQUEDUCTS.get(name) is aqueduct else "plugin"
    )
    return CalendarMetadata(
        name=name,
        title=metadata.title if metadata else name,
        description=metadata.description if metadata else "",
        units=[brick.name for brick in aqueduct.bricks],
        source=source,
    )


def load_user_aqueducts(spec: object, base_dir: Path) -> None:
    """Load top-level ``aqueduct`` plugins declared as name -> Python path.

    Each module must export an :class:`Aqueduct` instance named ``aqueduct``.
    Registrations are reset to the built-in baseline before every story load.
    """

    AQUEDUCTS.clear()
    AQUEDUCTS.update(_BUILTIN_AQUEDUCTS)

    if spec is None:
        return
    if not isinstance(spec, Mapping):
        raise PluginError(
            "AQUEDUCT_CONFIG_INVALID",
            "顶层 aqueduct 必须是「注册名: 文件路径」的映射",
            path=("aqueduct",),
        )

    for name, raw_path in spec.items():
        if not isinstance(name, str):
            raise PluginError(
                "AQUEDUCT_NAME_INVALID",
                f"aqueduct 注册名必须是字符串, 得到 {type(name).__name__}",
                path=("aqueduct",),
            )
        if not isinstance(raw_path, str):
            raise PluginError(
                "AQUEDUCT_PATH_INVALID",
                f"aqueduct 插件 {name!r} 的路径必须是字符串, "
                f"得到 {type(raw_path).__name__}",
                path=("aqueduct", name),
            )

        path = Path(raw_path)
        if not path.is_absolute():
            path = base_dir / path
        if not path.is_file():
            raise PluginError(
                "AQUEDUCT_FILE_NOT_FOUND",
                f"aqueduct 插件文件不存在: {raw_path!r} (解析为 {path})",
                path=("aqueduct", name),
                details={"plugin_path": str(path)},
            )

        try:
            module = _load_aqueduct_plugin_module(path, name)
        except Exception as exc:
            raise PluginError(
                "AQUEDUCT_LOAD_FAILED",
                f"aqueduct 插件 {name!r} ({path}) 加载失败: {exc}",
                path=("aqueduct", name),
                details={
                    "plugin_path": str(path),
                    "exception_type": type(exc).__name__,
                    "reason": str(exc),
                },
            ) from exc

        plugin = getattr(module, "aqueduct", None)
        if not isinstance(plugin, Aqueduct):
            raise PluginError(
                "AQUEDUCT_EXPORT_INVALID",
                f"aqueduct 插件 {name!r} ({path}) "
                "必须导出 Aqueduct 实例 aqueduct",
                path=("aqueduct", name),
                details={"plugin_path": str(path)},
            )
        AQUEDUCTS[name] = plugin


def _load_aqueduct_plugin_module(path: Path, name: str) -> object:
    module_name = f"_weft_user_aqueduct__{name}"
    spec = importlib.util.spec_from_file_location(module_name, path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class Phase(BaseModel):
    base_time: list[int]
    ref_time: list[int] | Phase | None = None
