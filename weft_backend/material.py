"""Moai material functions — 从 Moai 属性计算出派生属性。"""

from collections.abc import Callable
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


_ABILITY_ALIASES = {
    "strength": ("strength", "str", "力量"),
    "dexterity": ("dexterity", "dex", "敏捷"),
    "constitution": ("constitution", "con", "体质"),
    "intelligence": ("intelligence", "int", "智力"),
    "wisdom": ("wisdom", "wis", "感知"),
    "charisma": ("charisma", "cha", "魅力"),
}

_SPELLCASTING_ABILITIES = {
    "artificer": "intelligence",
    "吟游诗人": "charisma",
    "bard": "charisma",
    "牧师": "wisdom",
    "cleric": "wisdom",
    "德鲁伊": "wisdom",
    "druid": "wisdom",
    "圣武士": "charisma",
    "paladin": "charisma",
    "弃誓者": "charisma",
    "弃誓绿骑士": "charisma",
    "oathbreaker": "charisma",
    "游侠": "wisdom",
    "ranger": "wisdom",
    "术士": "charisma",
    "sorcerer": "charisma",
    "邪术师": "charisma",
    "warlock": "charisma",
    "法师": "intelligence",
    "wizard": "intelligence",
}

_DND_PASSTHROUGH_FIELDS = (
    "role",
    "gender",
    "subrace",
    "subclass",
    "background",
    "alignment",
    "deity",
    "experience",
    "hit_points",
    "armor_class",
    "speed",
    "size",
    "languages",
    "proficiencies",
    "skills",
    "saving_throws",
    "equipment",
    "spells",
    "temporary_effects",
    "permanent_effects",
    "appearance",
    "personality",
    "ideals",
    "bonds",
    "flaws",
    "ending_state",
)


def _ability_scores(props: dict[str, Any]) -> dict[str, Any]:
    """Collect ability scores from an ``abilities`` map or top-level aliases."""

    nested = props.get("abilities")
    sources = [nested, props] if isinstance(nested, dict) else [props]
    scores: dict[str, Any] = {}
    for canonical, aliases in _ABILITY_ALIASES.items():
        for source in sources:
            for alias in aliases:
                if alias in source:
                    scores[canonical] = source[alias]
                    break
            if canonical in scores:
                break
    return scores


def _classes(props: dict[str, Any]) -> list[dict[str, Any]]:
    """Normalize single- and multi-class declarations."""

    raw = props.get("classes", props.get("class"))
    default_level = props.get("level")
    if isinstance(raw, str):
        item: dict[str, Any] = {"name": raw}
        if type(default_level) is int:
            item["level"] = default_level
        return [item]
    if not isinstance(raw, list):
        return []

    classes: list[dict[str, Any]] = []
    for value in raw:
        if isinstance(value, str):
            classes.append({"name": value})
        elif isinstance(value, dict) and isinstance(value.get("name"), str):
            item = {"name": value["name"]}
            if type(value.get("level")) is int:
                item["level"] = value["level"]
            if isinstance(value.get("subclass"), str):
                item["subclass"] = value["subclass"]
            classes.append(item)
    return classes


def _total_level(classes: list[dict[str, Any]], fallback: Any) -> int | None:
    levels = [item.get("level") for item in classes]
    if levels and all(type(level) is int and level > 0 for level in levels):
        return sum(levels)
    if type(fallback) is int and fallback > 0:
        return fallback
    return None


def dnd(moai: MaterialTarget) -> dict[str, Any]:
    """Build a normalized D&D character profile from a moai's extra fields.

    The material deliberately derives only deterministic rules data. Textual
    scores such as ``charisma: 极高`` remain visible in ``ability_scores`` but
    do not receive a fabricated numeric modifier.
    """

    props = moai.extra_props or {}
    profile: dict[str, Any] = {"name": moai.name}
    if isinstance(props.get("race"), str):
        profile["race"] = props["race"]

    classes = _classes(props)
    if classes:
        profile["classes"] = classes

    total_level = _total_level(classes, props.get("level"))
    if total_level is not None:
        profile["level"] = total_level
        profile["proficiency_bonus"] = 2 + (total_level - 1) // 4

    scores = _ability_scores(props)
    if scores:
        profile["ability_scores"] = scores
        modifiers = {
            ability: (score - 10) // 2
            for ability, score in scores.items()
            if type(score) is int and 1 <= score <= 30
        }
        if modifiers:
            profile["ability_modifiers"] = modifiers

    spellcasting = {
        _SPELLCASTING_ABILITIES[item["name"].casefold()]
        for item in classes
        if item["name"].casefold() in _SPELLCASTING_ABILITIES
    }
    if len(spellcasting) == 1:
        profile["spellcasting_ability"] = spellcasting.pop()
    elif spellcasting:
        profile["spellcasting_abilities"] = sorted(spellcasting)

    for field in _DND_PASSTHROUGH_FIELDS:
        if field in props:
            profile[field] = props[field]
    return profile


# 注册表: 名称 → 计算函数
MATERIALS: dict[str, Callable[[MaterialTarget], Any]] = {
    "constellation": constellation,
    "dnd": dnd,
}
