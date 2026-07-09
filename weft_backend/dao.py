from __future__ import annotations

from typing import Literal

import yaml
from pydantic import BaseModel, Field, computed_field

from weft_backend.aqueduct import Phase, gregorian_aqueduct
from weft_backend.material import MATERIALS

# ── Phase: YAML time-list → Phase ───────────────────────────────────


def _phase(data: list) -> Phase:
    """Parse a YAML time list ``[*base, ref?]`` into a Phase.

    Leading ints are ``base_time`` ; an optional trailing list is ``ref_time``
    (recursively another time list, the point the offset is relative to).
    Short base_time arrays are zero-padded to the aqueduct brick count.
    """
    n = len(gregorian_aqueduct.bricks)
    *base, tail = data
    if isinstance(tail, list):  # [*base, ref]
        return Phase(
            base_time=list(base) + [0] * (n - len(base)), ref_time=_phase(tail)
        )
    base = list(data) + [0] * (n - len(data))
    return Phase(base_time=base)


# ── Models ──────────────────────────────────────────────────────────


class Moai(BaseModel):
    key: str
    full_name: str
    base_time: Phase | None = None
    description: str
    materials: list[str] = Field(default_factory=list)
    extra_props: dict | None = None

    def apply_material(self, name: str) -> str | None:
        """应用单个 material 函数，返回计算出的派生属性。

        material 读取 Moai 的某个属性，通过一系列计算得到另一个属性。
        当前支持的 material 见 :mod:`weft_backend.material` 的 ``MATERIALS`` 注册表。
        """

        fn = MATERIALS.get(name)
        if fn is None:
            raise ValueError(f"未知的 material: {name!r}")
        if self.base_time is None:
            return None
        flat = gregorian_aqueduct.de_recursive(self.base_time)
        return fn(flat)

    @computed_field  # type: ignore[prop-decorator]
    @property
    def base_time_display(self) -> str | None:
        if self.base_time is None:
            return None
        flat = gregorian_aqueduct.de_recursive(self.base_time)
        return gregorian_aqueduct.humanize(gregorian_aqueduct.normalize(flat))

    @classmethod
    def from_yaml(cls, data: dict) -> Moai:
        known = set(cls.model_fields)
        extra = {k: v for k, v in data.items() if k not in known}
        moai = cls(
            key=data["_key"],
            full_name=data["full_name"],
            base_time=_phase(data["base_time"]) if "base_time" in data else None,
            description=data.get("description", ""),
            materials=data.get("materials", []),
            extra_props=extra or None,
        )
        # 解析时计算 materials，结果写入 extra_props
        if moai.materials and moai.base_time is not None:
            computed = {name: moai.apply_material(name) for name in moai.materials}
            moai.extra_props = {**(moai.extra_props or {}), **computed}
        return moai


class MoaiLink(BaseModel):
    moais: tuple[Moai, Moai]
    relations: str
    bidirectional: bool = True

    @classmethod
    def from_yaml(cls, data: dict, moais: dict[str, Moai]) -> MoaiLink:
        a, b = data["moais"]
        for name in (a, b):
            if name not in moais:
                raise KeyError(f"moai_link 引用了不存在的 moai: {name!r}")
        return cls(
            moais=(moais[a], moais[b]),
            relations=data["relations"],
            bidirectional=data.get("bidirectional", True),
        )


class Story(BaseModel):
    title: str
    summary: str | None = None
    description: str | None = None
    date_mode: Literal["gregorian"]

    @classmethod
    def from_yaml(cls, data: dict) -> Story:
        return cls(
            title=data.get("title", ""),
            summary=data.get("summary"),
            description=data.get("description"),
            date_mode="gregorian",
        )


class Drift(BaseModel):
    title: str = Field(max_length=20)
    start_time: Phase
    end_time: Phase | None = None
    description: str | None = None
    moais: list[Moai] | None = None

    @computed_field  # type: ignore[prop-decorator]
    @property
    def flat_start(self) -> list[int]:
        return gregorian_aqueduct.de_recursive(self.start_time)

    @computed_field  # type: ignore[prop-decorator]
    @property
    def flat_end(self) -> list[int] | None:
        return gregorian_aqueduct.de_recursive(self.end_time) if self.end_time else None

    @computed_field  # type: ignore[prop-decorator]
    @property
    def moai_offsets(self) -> dict[str, dict[str, str | None]] | None:
        """每个关联 moai 在漂移事件发生/结束时的年龄（人性化字符串）。"""
        if not self.moais:
            return None
        result: dict[str, dict[str, str | None]] = {}
        for m in self.moais:
            if m.base_time is None:
                continue
            m_flat = gregorian_aqueduct.de_recursive(m.base_time)
            entry: dict[str, str | None] = {
                "start": gregorian_aqueduct.humanize(
                    gregorian_aqueduct.normalize(
                        gregorian_aqueduct.minus(self.flat_start, m_flat)
                    )
                )
            }
            if self.flat_end is not None:
                entry["end"] = gregorian_aqueduct.humanize(
                    gregorian_aqueduct.normalize(
                        gregorian_aqueduct.minus(self.flat_end, m_flat)
                    )
                )
            else:
                entry["end"] = None
            result[m.key] = entry
        return result or None

    @classmethod
    def from_yaml(cls, data: dict, moais: dict[str, Moai]) -> Drift:
        moai_names = data.get("moais", [])
        for name in moai_names:
            if name not in moais:
                raise KeyError(f"drift 引用了不存在的 moai: {name!r}")

        return cls(
            title=data["title"],
            start_time=_phase(data["start_time"]),
            end_time=_phase(data["end_time"]) if "end_time" in data else None,
            description=data.get("description"),
            moais=[moais[m] for m in moai_names] if moai_names else None,
        )


class Dao(BaseModel):
    story: Story
    moai: dict[str, Moai] | None = None
    moai_link: dict[str, list[MoaiLink]] | None = None
    drift: dict[str, list[Drift]] | None = None

    @classmethod
    def from_yaml(cls, raw: dict) -> Dao:
        # Moai first: links and drifts reference moais by name.
        moais = {
            name: Moai.from_yaml({"_key": name, **m})
            for name, m in raw.get("moai", {}).items()
        }
        drifts = {
            season: [Drift.from_yaml(d, moais) for d in events]
            for season, events in raw.get("drift", {}).items()
        } or None
        return cls(
            story=Story.from_yaml(raw.get("story", {})),
            moai=moais or None,
            moai_link={
                label: [MoaiLink.from_yaml(link, moais) for link in links]
                for label, links in raw.get("moai_link", {}).items()
            }
            or None,
            drift=drifts,
        )


# ── Public API ──────────────────────────────────────────────────────


def load_dao(path: str) -> Dao:
    """Load a YAML file and return a fully-resolved ``Dao``."""
    with open(path) as fh:
        return Dao.from_yaml(yaml.safe_load(fh))
