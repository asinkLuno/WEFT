"""Karhidish calendar from Ursula K. Le Guin's *The Left Hand of Darkness*.

WEFT coordinates the moving "Year One" as follows:

* 1 is Year One (the current year)
* 0 is one year ago
* 2 is one year to come

This keeps dates sortable while preserving the Gethenian way of naming years.
The calendar has 14 months, 26 named days per month, and 10 hours per day.
"""

from collections.abc import Sequence
from sys import maxsize

from weft_backend.aqueduct import Aqueduct, Brick

MONTHS = (
    "Thern",
    "Thanern",
    "Nimmer",
    "Anner",
    "Irrem",
    "Moth",
    "Tuwa",
    "Osme",
    "Ockre",
    "Kus",
    "Hakanna",
    "Gor",
    "Susmy",
    "Grende",
)

DAYS = (
    "Getheny",
    "Sordny",
    "Eps",
    "Arhad",
    "Netherhad",
    "Streth",
    "Berny",
    "Orny",
    "Harhahad",
    "Guyrny",
    "Yrny",
    "Posthe",
    "Tormenbod",
    "Odgetheny",
    "Odsordny",
    "Odeps",
    "Odarhad",
    "Onnetherhad",
    "Odstreth",
    "Odberny",
    "Odorny",
    "Odharhahad",
    "Odguyrny",
    "Odyrny",
    "Odposthe",
    "Ottormenbod",
)


def _year_name(year: int) -> str:
    if year == 1:
        return "Year One"
    distance = abs(year - 1)
    direction = "ago" if year < 1 else "to come"
    return f"{distance} year{'s' if distance != 1 else ''} {direction}"


def _humanize(values: Sequence[int], bricks: Sequence[Brick]) -> str:
    del bricks
    year, month, day, hour = values
    if not any(values):
        return "0 years, 0 months, 0 days"
    if 1 <= month <= len(MONTHS) and 1 <= day <= len(DAYS):
        clock = f", hour {hour}" if hour else ""
        return f"{DAYS[day - 1]} {MONTHS[month - 1]}, {_year_name(year)}{clock}"
    return " ".join(
        part
        for part in (
            f"{year} year" if year else "",
            f"{month} month" if month else "",
            f"{day} day" if day else "",
            f"{hour} hour" if hour else "",
        )
        if part
    )


def _to_tick(values: list[int]) -> int:
    year, month, day, hour = values
    return (((year * 14 + month - 1) * 26 + day - 1) * 10) + hour


aqueduct = Aqueduct(
    [
        Brick("year", lambda ctx: maxsize),
        Brick("month", lambda ctx: 14),
        Brick("day", lambda ctx: 26),
        Brick("hour", lambda ctx: 10),
    ],
    to_tick=_to_tick,
    humanizer=_humanize,
)
