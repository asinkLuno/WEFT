"""《黑暗的左手》卡尔海德历法。

时间坐标依次为：[相对年、月、日、时]。
相对年 1 是“元年”（今年），0 是去年，2 是明年。
"""

from collections.abc import Sequence
from sys import maxsize

from weft_backend.aqueduct import Aqueduct, Brick

MONTHS = (
    "瑟恩",
    "萨瑟恩",
    "尼默",
    "安纳",
    "伊勒姆",
    "莫斯",
    "图瓦",
    "奥斯默",
    "奥克尔",
    "库斯",
    "哈坎纳",
    "戈尔",
    "苏斯米",
    "格伦德",
)

DAYS = (
    "格辛尼",
    "索德尼",
    "埃普斯",
    "阿尔哈德",
    "奈瑟哈德",
    "斯特雷斯",
    "伯尼",
    "奥尼",
    "哈尔哈哈德",
    "盖尔尼",
    "厄尔尼",
    "波斯特",
    "托门博德",
    "奥德格辛尼",
    "奥德索德尼",
    "奥德埃普斯",
    "奥德阿尔哈德",
    "奥奈瑟哈德",
    "奥德斯特雷斯",
    "奥德伯尼",
    "奥德奥尼",
    "奥德哈尔哈哈德",
    "奥德盖尔尼",
    "奥德厄尔尼",
    "奥德波斯特",
    "奥托门博德",
)


def _year_name(year: int) -> str:
    if year == 1:
        return "元年"
    distance = abs(year - 1)
    return f"{distance}年前" if year < 1 else f"{distance}年后"


def _humanize(values: Sequence[int], bricks: Sequence[Brick]) -> str:
    del bricks
    year, month, day, hour = values
    if not any(values):
        return "0年0月0日"
    if 1 <= month <= len(MONTHS) and 1 <= day <= len(DAYS):
        clock = f"，第{hour}时" if hour else ""
        return f"{_year_name(year)}·{DAYS[day - 1]}·{MONTHS[month - 1]}{clock}"
    return "、".join(
        part
        for part in (
            f"{year}年" if year else "",
            f"{month}月" if month else "",
            f"{day}日" if day else "",
            f"{hour}时" if hour else "",
        )
        if part
    )


def _to_tick(values: list[int]) -> int:
    year, month, day, hour = values
    return (((year * 14 + month - 1) * 26 + day - 1) * 10) + hour


aqueduct = Aqueduct(
    [
        Brick("年", lambda ctx: maxsize),
        Brick("月", lambda ctx: 14),
        Brick("日", lambda ctx: 26),
        Brick("时", lambda ctx: 10),
    ],
    to_tick=_to_tick,
    humanizer=_humanize,
)
