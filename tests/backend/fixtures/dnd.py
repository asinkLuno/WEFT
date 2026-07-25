"""D&D 角色档案 material —— 用户插件范例（非内置）。

从 moai 的扩展字段（race / class / level / abilities / ...）构建规范化的 D&D
角色档案与可确定的规则派生值（proficiency_bonus、ability_modifiers、
spellcasting_ability 等）。只用标准库；在故事文件顶层声明即可启用：

    material:
      dnd: ./dnd.py
    moai:
      某角色:
        materials: [dnd]
        race: 提夫林
        class: 术士
        level: 5
"""

from typing import Any

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


def material(moai):
    """Build a normalized D&D character profile from a moai's extra fields.

    Deliberately derives only deterministic rules data. Textual scores such as
    ``charisma: 极高`` stay visible in ``ability_scores`` but receive no
    fabricated numeric modifier.
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
