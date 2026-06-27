from typing import Callable
from sys import maxsize


class Brick:
    def __init__(self, name: str, get_limit: Callable[[dict[str, int]], int]):
        self.name = name
        self.get_limit = get_limit


class Aqueduct:
    def __init__(self, bricks: list[Brick]):
        self.bricks = bricks

    def normalize(self, values: list[int]) -> list[int]:
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


def get_days_in_month(ctx: dict) -> int:
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
    raise ValueError(f"非法的月份: {month}")


gregorian_aqueduct = Aqueduct(
    [
        Brick("年", get_limit=lambda ctx: maxsize),
        Brick("月", get_limit=lambda ctx: 12),
        Brick("日", get_limit=get_days_in_month),
        Brick("时", get_limit=lambda ctx: 24),
        Brick("分", get_limit=lambda ctx: 60),
        Brick("秒", get_limit=lambda ctx: 60),
    ]
)
