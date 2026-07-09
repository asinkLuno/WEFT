from __future__ import annotations

from typing import Callable, Literal

import yaml
from pydantic import BaseModel, Field, computed_field

from weft_backend.aqueduct import Aqueduct, Phase, gregorian_aqueduct
from weft_backend.material import MATERIALS

AQUEDUCTS: dict[str, Aqueduct] = {"gregorian": gregorian_aqueduct}

# ── Phase: YAML time-list → Phase ───────────────────────────────────


def _phase(data: list, aqueduct: Aqueduct) -> Phase:
    """Parse a YAML time list ``[*base, ref?]`` into a Phase.

    Leading ints are ``base_time`` ; an optional trailing list is ``ref_time``
    (recursively another time list, the point the offset is relative to).
    Short base_time arrays are zero-padded to the aqueduct brick count.
    """
    n = len(aqueduct.bricks)
    *base, tail = data
    if isinstance(tail, list):  # [*base, ref]
        return Phase(
            base_time=list(base) + [0] * (n - len(base)),
            ref_time=_phase(tail, aqueduct),
        )
    base = list(data) + [0] * (n - len(data))
    return Phase(base_time=base)


# ── Models ──────────────────────────────────────────────────────────


class Moai(BaseModel):
    model_config = {"arbitrary_types_allowed": True}

    key: str
    full_name: str
    base_time: Phase | None = None
    description: str
    materials: list[str] = Field(default_factory=list)
    extra_props: dict | None = None
    aqueduct: Aqueduct = Field(exclude=True)
    journal: dict[str, tuple[Phase, Phase | None]] = Field(default_factory=dict)

    def apply_material(self, name: str) -> str | None:
        """应用单个 material 函数，返回计算出的派生属性。

        material 接收 Moai 实例，可读取任意属性（base_time, extra_props 等）。
        当前支持的 material 见 :mod:`weft_backend.material` 的 ``MATERIALS`` 注册表。
        """

        fn: Callable = MATERIALS.get(name, None)
        if fn is None:
            raise ValueError(f"未知的 material: {name!r}")
        return fn(self)

    @computed_field  # type: ignore[prop-decorator]
    @property
    def base_time_display(self) -> str | None:
        if self.base_time is None:
            return None
        flat = self.aqueduct.de_recursive(self.base_time)
        return self.aqueduct.humanize(self.aqueduct.normalize(flat))

    @classmethod
    def from_yaml(cls, data: dict, aqueduct: Aqueduct) -> Moai:
        known = set(cls.model_fields)
        extra = {k: v for k, v in data.items() if k not in known}
        moai = cls(
            key=data["_key"],
            full_name=data["full_name"],
            base_time=_phase(data["base_time"], aqueduct)
            if "base_time" in data
            else None,
            description=data.get("description", ""),
            materials=data.get("materials", []),
            extra_props=extra or None,
            aqueduct=aqueduct,
        )
        # 解析时计算 materials，结果写入 extra_props
        if moai.materials and moai.base_time is not None:
            computed = {name: moai.apply_material(name) for name in moai.materials}
            moai.extra_props = {**(moai.extra_props or {}), **computed}
        return moai


class MoaiLink(BaseModel):
    moais: tuple[Moai, Moai]
    relations: str
    bidirectional: bool

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
    description: str | None = None
    date_mode: Literal["gregorian"]

    @classmethod
    def from_yaml(cls, data: dict) -> Story:
        return cls(
            title=data.get("title"),
            description=data.get("description"),
            date_mode="gregorian",
        )


class Drift(BaseModel):
    model_config = {"arbitrary_types_allowed": True}

    title: str
    start_time: Phase
    end_time: Phase | None = None
    description: str | None = None
    moais: list[Moai] | None = None
    aqueduct: Aqueduct = Field(exclude=True)

    @computed_field  # type: ignore[prop-decorator]
    @property
    def flat_start(self) -> list[int]:
        return self.aqueduct.de_recursive(self.start_time)

    @computed_field  # type: ignore[prop-decorator]
    @property
    def flat_end(self) -> list[int] | None:
        return self.aqueduct.de_recursive(self.end_time) if self.end_time else None

    @classmethod
    def from_yaml(
        cls, title: str, data: dict, moais: dict[str, Moai], aqueduct: Aqueduct
    ) -> Drift:
        moai_names = data.get("moais", [])
        for name in moai_names:
            if name not in moais:
                raise KeyError(f"drift 引用了不存在的 moai: {name!r}")

        drift = cls(
            title=title,
            start_time=_phase(data["start_time"], aqueduct),
            end_time=_phase(data["end_time"], aqueduct) if "end_time" in data else None,
            description=data.get("description"),
            moais=[moais[m] for m in moai_names] if moai_names else None,
            aqueduct=aqueduct,
        )

        # 将偏移量写回各 moai 的 journal，避免在 Drift 上多维护 moai_offsets
        if drift.moais:
            for m in drift.moais:
                if m.base_time is None:
                    continue
                m_flat = aqueduct.de_recursive(m.base_time)
                start_phase = Phase(
                    base_time=aqueduct.normalize(
                        aqueduct.minus(drift.flat_start, m_flat)
                    )
                )
                end_phase = None
                if drift.flat_end is not None:
                    end_phase = Phase(
                        base_time=aqueduct.normalize(
                            aqueduct.minus(drift.flat_end, m_flat)
                        )
                    )
                m.journal[drift.title] = (start_phase, end_phase)

        return drift


class Dao(BaseModel):
    story: Story
    moai: dict[str, Moai] | None = None
    moai_link: dict[str, list[MoaiLink]] | None = None
    drift: dict[str, list[Drift]] | None = None

    @classmethod
    def from_yaml(cls, raw: dict) -> Dao:
        story_raw = raw.get("story", {})
        date_mode = story_raw.get("date_mode", "gregorian")
        aqueduct = AQUEDUCTS[date_mode]

        # Moai first: links and drifts reference moais by name.
        moais = {
            name: Moai.from_yaml({"_key": name, **m}, aqueduct)
            for name, m in raw.get("moai", {}).items()
        }
        drifts = {
            season: [
                Drift.from_yaml(title, data, moais, aqueduct)
                for title, data in events.items()
            ]
            for season, events in raw.get("drift", {}).items()
        } or None
        return cls(
            story=Story.from_yaml(story_raw),
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
