from __future__ import annotations
from typing import Callable
from sys import maxsize
from pydantic import BaseModel


class Brick:
    def __init__(self, name: str, get_limit: Callable[[dict[str, int]], int]):
        self.name = name
        self.get_limit = get_limit


class Aqueduct:
    def __init__(self, bricks: list[Brick]):
        self.bricks = bricks

    def is_time_unit(self, value: object) -> None:
        """检查是否为合法的 time_unit，不合法则抛出 ValueError。"""
        if not isinstance(value, list):
            raise ValueError(f"期望 list[int]，实际类型: {type(value).__name__}")
        if len(value) != len(self.bricks):
            raise ValueError(f"长度应为 {len(self.bricks)}，实际: {len(value)}")
        if not all(isinstance(x, int) for x in value):
            raise ValueError(f"元素应全为 int，实际: {value}")

    def normalize(self, values: list[int]) -> list[int]:
        self.is_time_unit(values)

        c = 0
        res = []
        names = [i.name for i in self.bricks]
        brick_values = {k: v for k, v in zip(names, values)}
        for brick in reversed(self.bricks):
            v = brick_values[brick.name] + c
            limit = brick.get_limit((brick_values))
            if limit != maxsize:
                c = v // limit
                v = v % limit
            else:
                c = 0
            res.append(v)

        return res[::-1]

    def humanize(self, values: list[int]) -> str:
        """
        转为人类可读的字符串
        """
        self.is_time_unit(values)
        res = ""
        names = [b.name for b in self.bricks]
        for n, v in zip(names, values):
            res += f"{v}{n}"
        return res

    def plus(self, tu1: list[int], tu2: list[int]) -> list[int]:
        self.is_time_unit(tu1)
        self.is_time_unit(tu2)

        res = [i + j for i, j in zip(tu1, tu2)]
        return res

    def minus(self, tu1: list[int], tu2: list[int]) -> list[int]:
        self.is_time_unit(tu1)
        self.is_time_unit(tu2)

        res = [i - j for i, j in zip(tu1, tu2)]
        if any(x < 0 for x in res):
            raise ValueError(f"substitute 结果不能为负: {res}")
        return res

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


def get_days_in_month(ctx: dict) -> int:
    def is_leap_year(year: int) -> bool:
        return (year % 4 == 0 and year % 100 != 0) or (year % 400 == 0)

    month = ctx["M"]
    year = ctx["Y"]
    if month in {1, 3, 5, 7, 8, 10, 12}:
        return 31
    if month in {4, 6, 9, 11}:
        return 30
    if month == 2:
        return 29 if is_leap_year(year) else 28
    # ponytail: offset-only phases carry M=0 (e.g. "10 years"); no month →
    # day can't carry, return maxsize so normalize skips it.
    return maxsize


gregorian_aqueduct = Aqueduct(
    [
        Brick("Y", get_limit=lambda ctx: maxsize),
        Brick("M", get_limit=lambda ctx: 12),
        Brick("D", get_limit=get_days_in_month),
        Brick("H", get_limit=lambda ctx: 24),
        Brick("m", get_limit=lambda ctx: 60),
        Brick("s", get_limit=lambda ctx: 60),
    ]
)


class Phase(BaseModel):
    base_time: list[int]
    ref_time: list[int] | Phase | None = None
