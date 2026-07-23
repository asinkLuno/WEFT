"""YAML 顶层 ``material`` 字段 → importlib 加载用户插件。"""

import textwrap
from pathlib import Path

import pytest

from weft_backend.dao import load_dao
from weft_backend.material import _BUILTIN_MATERIALS, MATERIALS


@pytest.fixture(autouse=True)
def _reset_materials():
    """每个测试前后把全局 MATERIALS 恢复为内置基线，避免插件污染其他测试。"""

    MATERIALS.clear()
    MATERIALS.update(_BUILTIN_MATERIALS)
    yield
    MATERIALS.clear()
    MATERIALS.update(_BUILTIN_MATERIALS)


def _write(path: Path, text: str) -> Path:
    path.write_text(textwrap.dedent(text), encoding="utf-8")
    return path


def _story(
    tmp_path: Path, materials: dict[str, str], moai_body: str
) -> Path:
    lines = ["story:", "  title: t"]
    if materials:
        lines.append("material:")
        for name, path in materials.items():
            lines.append(f"  {name}: {path}")
    lines.append("moai:")
    lines.append(textwrap.indent(textwrap.dedent(moai_body).strip(), "  "))
    return _write(tmp_path / "story.yml", "\n".join(lines) + "\n")


def test_user_material_loads_and_appears_in_extra_props(tmp_path: Path) -> None:
    _write(
        tmp_path / "level.py",
        """
        def material(moai):
            props = moai.extra_props or {}
            return {"tier": "高" if (props.get("power") or 0) >= 90 else "低"}
        """,
    )
    story = _story(
        tmp_path,
        {"level": "./level.py"},
        """
        主角:
          materials: [level]
          power: 95
        """,
    )

    dao = load_dao(story)

    assert dao.moai["主角"].extra_props["level"] == {"tier": "高"}


def test_relative_path_resolved_against_story_dir(tmp_path: Path) -> None:
    (tmp_path / "plugins").mkdir()
    _write(
        tmp_path / "plugins" / "tag.py",
        """
        def material(moai):
            return {"tagged": True}
        """,
    )
    story = _story(
        tmp_path,
        {"tag": "plugins/tag.py"},
        """
        x:
          materials: [tag]
        """,
    )

    dao = load_dao(story)

    assert dao.moai["x"].extra_props["tag"] == {"tagged": True}


def test_user_material_overrides_builtin(tmp_path: Path) -> None:
    _write(
        tmp_path / "fake_zodiac.py",
        """
        def material(moai):
            return {"overridden": True}
        """,
    )
    story = _story(
        tmp_path,
        {"constellation": "./fake_zodiac.py"},
        """
        c:
          base_time: [1983, 1, 20, 0, 0, 0]
          materials: [constellation]
        """,
    )

    dao = load_dao(story)

    # built-in constellation would return "水瓶座" for 1983-01-20; the plugin wins
    assert dao.moai["c"].extra_props["constellation"] == {"overridden": True}


def test_relocated_dnd_plugin_computes_profile(tmp_path: Path) -> None:
    dnd_plugin = Path(__file__).parent / "dnd.py"
    story = _story(
        tmp_path,
        {"dnd": str(dnd_plugin)},
        """
        薇克丝:
          materials: [dnd]
          race: 提夫林
          class: 术士
          level: 5
          intelligence: 8
          charisma: 18
        """,
    )

    dao = load_dao(story)

    profile = dao.moai["薇克丝"].extra_props["dnd"]
    assert profile["race"] == "提夫林"
    assert profile["classes"] == [{"name": "术士", "level": 5}]
    assert profile["level"] == 5
    assert profile["proficiency_bonus"] == 3
    assert profile["ability_scores"] == {"intelligence": 8, "charisma": 18}
    assert profile["ability_modifiers"] == {"intelligence": -1, "charisma": 4}
    assert profile["spellcasting_ability"] == "charisma"


def test_missing_plugin_file_raises(tmp_path: Path) -> None:
    story = _story(
        tmp_path,
        {"nope": "./missing.py"},
        """
        c:
          materials: [nope]
        """,
    )

    with pytest.raises(ValueError, match="插件文件不存在"):
        load_dao(story)


def test_plugin_without_material_function_raises(tmp_path: Path) -> None:
    _write(
        tmp_path / "bad.py",
        """
        def not_material(moai):
            return {}
        """,
    )
    story = _story(
        tmp_path,
        {"bad": "./bad.py"},
        """
        c:
          materials: [bad]
        """,
    )

    with pytest.raises(ValueError, match="缺少固定入口函数"):
        load_dao(story)


def test_plugin_load_exception_wrapped(tmp_path: Path) -> None:
    _write(
        tmp_path / "boom.py",
        """
        raise RuntimeError("boom inside plugin")
        """,
    )
    story = _story(
        tmp_path,
        {"boom": "./boom.py"},
        """
        c:
          materials: [boom]
        """,
    )

    with pytest.raises(ValueError, match="加载失败"):
        load_dao(story)


def test_non_mapping_material_raises(tmp_path: Path) -> None:
    story = _write(
        tmp_path / "story.yml",
        """
        story:
          title: t
        material:
          - ./x.py
        moai:
          c: {}
        """,
    )

    with pytest.raises(ValueError, match="必须是「注册名: 文件路径」的映射"):
        load_dao(story)
