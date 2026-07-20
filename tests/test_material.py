from weft_backend.aqueduct import gregorian_aqueduct
from weft_backend.dao import Moai


def make_moai(**data: object) -> Moai:
    return Moai.from_dict("测试角色", data, gregorian_aqueduct)


def test_dnd_material_without_base_time() -> None:
    moai = make_moai(
        materials=["dnd"],
        race="提夫林",
        **{
            "class": "术士",
            "level": 5,
            "intelligence": 8,
            "charisma": 18,
        },
    )

    assert moai.extra_props is not None
    assert moai.extra_props["dnd"] == {
        "name": "测试角色",
        "race": "提夫林",
        "classes": [{"name": "术士", "level": 5}],
        "level": 5,
        "proficiency_bonus": 3,
        "ability_scores": {"intelligence": 8, "charisma": 18},
        "ability_modifiers": {"intelligence": -1, "charisma": 4},
        "spellcasting_ability": "charisma",
    }


def test_dnd_material_preserves_textual_scores_without_inventing_modifier() -> None:
    moai = make_moai(
        materials=["dnd"],
        abilities={"力量": 10, "魅力": "极高"},
    )

    assert moai.extra_props is not None
    profile = moai.extra_props["dnd"]
    assert profile["ability_scores"] == {"strength": 10, "charisma": "极高"}
    assert profile["ability_modifiers"] == {"strength": 0}


def test_dnd_material_supports_multiclass_and_passthrough_fields() -> None:
    moai = make_moai(
        materials=["dnd"],
        classes=[
            {"name": "吟游诗人", "level": 3, "subclass": "逸闻学院"},
            {"name": "邪术师", "level": 2},
        ],
        background="骗子",
        alignment="混乱中立",
        languages=["通用语", "精灵语"],
    )

    assert moai.extra_props is not None
    profile = moai.extra_props["dnd"]
    assert profile["level"] == 5
    assert profile["proficiency_bonus"] == 3
    assert profile["spellcasting_ability"] == "charisma"
    assert profile["background"] == "骗子"
    assert profile["alignment"] == "混乱中立"
    assert profile["languages"] == ["通用语", "精灵语"]


def test_constellation_still_works() -> None:
    moai = make_moai(
        materials=["constellation"],
        base_time=[1983, 1, 20, 0, 0, 0],
    )

    assert moai.extra_props is not None
    assert moai.extra_props["constellation"] == "水瓶座"
