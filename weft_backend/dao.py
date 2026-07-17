from __future__ import annotations

import json
import tomllib
from pathlib import Path
from typing import Literal

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

    name: str
    base_time: Phase | None = None
    description: str
    materials: list[str] = Field(default_factory=list)
    extra_props: dict | None = None
    aqueduct: Aqueduct = Field(exclude=True)
    journal: dict[str, tuple[str, str | None]] = Field(default_factory=dict)

    def apply_material(self, name: str) -> str | None:
        """应用单个 material 函数，返回计算出的派生属性。

        material 接收 Moai 实例，可读取任意属性（base_time, extra_props 等）。
        当前支持的 material 见 :mod:`weft_backend.material` 的 ``MATERIALS`` 注册表。
        """

        fn = MATERIALS.get(name)
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
    def from_dict(cls, name: str, data: dict, aqueduct: Aqueduct) -> Moai:
        known = set(cls.model_fields)
        extra = {k: v for k, v in data.items() if k not in known}
        moai = cls(
            name=name,
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
    def from_dict(cls, data: dict, moais: dict[str, Moai]) -> MoaiLink:
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
    def from_dict(cls, data: dict) -> Story:
        title = data.get("title")
        if not isinstance(title, str):
            raise ValueError("story.title 必须是字符串")
        return cls(
            title=title,
            description=data.get("description"),
            date_mode="gregorian",
        )


class Drift(BaseModel):
    model_config = {"arbitrary_types_allowed": True}

    title: str = Field(max_length=20)
    start_time: Phase
    end_time: Phase | None = None
    description: str | None = None
    moais: list[str] | None = None
    aqueduct: Aqueduct = Field(exclude=True)

    @computed_field  # type: ignore[prop-decorator]
    @property
    def flat_start(self) -> list[int]:
        return self.aqueduct.de_recursive(self.start_time)

    @computed_field  # type: ignore[prop-decorator]
    @property
    def flat_end(self) -> list[int] | None:
        return self.aqueduct.de_recursive(self.end_time) if self.end_time else None

    @computed_field  # type: ignore[prop-decorator]
    @property
    def start_tick(self) -> int:
        return self.aqueduct.to_tick(self.flat_start)

    @computed_field  # type: ignore[prop-decorator]
    @property
    def end_tick(self) -> int | None:
        return self.aqueduct.to_tick(self.flat_end) if self.flat_end else None

    @computed_field  # type: ignore[prop-decorator]
    @property
    def start_time_display(self) -> str:
        return self.aqueduct.humanize(self.flat_start)

    @computed_field  # type: ignore[prop-decorator]
    @property
    def end_time_display(self) -> str | None:
        return self.aqueduct.humanize(self.flat_end) if self.flat_end else None

    @classmethod
    def from_dict(
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
            moais=moai_names or None,
            aqueduct=aqueduct,
        )

        # 计算各 moai 相对偏移量，humanize 后写入 journal
        if drift.moais:
            for name in drift.moais:
                _record_moai_drift_time(moais[name], drift, aqueduct)

        return drift


class Narrative(BaseModel):
    """A selection of drift groups viewed relative to one moai."""

    subject: list[str]
    observer: str

    @classmethod
    def from_dict(
        cls,
        data: dict,
        drifts: dict[str, list[Drift]],
        moais: dict[str, Moai],
        aqueduct: Aqueduct,
    ) -> Narrative:
        subject = data.get("subject", [])
        observer = data.get("observer")
        if not isinstance(subject, list) or not all(
            isinstance(name, str) for name in subject
        ):
            raise ValueError("narrative.subject 必须是 drift 名称列表")
        for name in subject:
            if name not in drifts:
                raise KeyError(f"narrative 引用了不存在的 drift: {name!r}")
        if observer not in moais:
            raise KeyError(f"narrative 引用了不存在的 observer moai: {observer!r}")

        narrative = cls(subject=subject, observer=observer)
        observer_moai = moais[observer]
        for drift_name in subject:
            for drift in drifts[drift_name]:
                drift.moais = list(dict.fromkeys([*(drift.moais or []), observer]))
                _record_moai_drift_time(observer_moai, drift, aqueduct)
        return narrative


def _record_moai_drift_time(moai: Moai, drift: Drift, aqueduct: Aqueduct) -> None:
    """Store a drift's start/end offsets from a moai's base time."""
    if moai.base_time is None:
        return
    base = aqueduct.de_recursive(moai.base_time)
    start = aqueduct.normalize(aqueduct.minus(drift.flat_start, base))
    end = (
        aqueduct.normalize(aqueduct.minus(drift.flat_end, base))
        if drift.flat_end is not None
        else None
    )
    moai.journal[drift.title] = (
        aqueduct.humanize(start),
        aqueduct.humanize(end) if end is not None else None,
    )


class Dao(BaseModel):
    story: Story
    moai: dict[str, Moai] | None = None
    moai_link: dict[str, list[MoaiLink]] | None = None
    drift: dict[str, list[Drift]] | None = None
    narrative: dict[str, Narrative] | None = None

    @classmethod
    def from_dict(cls, raw: dict) -> Dao:
        story_raw = raw.get("story", {})
        date_mode = story_raw.get("date_mode", "gregorian")
        aqueduct = AQUEDUCTS[date_mode]

        # Moai first: links and drifts reference moais by name.
        moais = {
            name: Moai.from_dict(name, m, aqueduct)
            for name, m in raw.get("moai", {}).items()
        }
        drift_raw = dict(raw.get("drift", {}))
        # Backward compatibility for files that initially placed narrative
        # below drift. A top-level narrative takes precedence.
        nested_narrative_raw = drift_raw.pop("narrative", {})
        narrative_raw = raw.get("narrative", nested_narrative_raw)
        drifts: dict[str, list[Drift]] = {}
        for season, events in drift_raw.items():
            drifts[season] = [
                Drift.from_dict(title, data, moais, aqueduct)
                for title, data in events.items()
            ]
        # 按各 season 最早 drift 的 start_time 排序
        if drifts:
            drifts = dict(
                sorted(
                    drifts.items(),
                    key=lambda item: min(d.flat_start for d in item[1]),
                )
            )
        return cls(
            story=Story.from_dict(story_raw),
            moai=moais or None,
            moai_link={
                label: [MoaiLink.from_dict(link, moais) for link in links]
                for label, links in raw.get("moai_link", {}).items()
            }
            or None,
            drift=drifts or None,
            narrative={
                name: Narrative.from_dict(data, drifts, moais, aqueduct)
                for name, data in narrative_raw.items()
            }
            or None,
        )


# ── Public API ──────────────────────────────────────────────────────


def load_dao(path: str) -> Dao:
    """Load a story file and return a fully-resolved ``Dao``.

    Format is detected from the file extension: ``.yaml`` / ``.yml`` (YAML),
    ``.json`` (JSON), ``.toml`` (TOML).
    """
    suffix = Path(path).suffix.lower()
    with open(path, "rb" if suffix == ".toml" else "r") as fh:  # type: ignore[assignment]
        if suffix in (".yaml", ".yml"):
            raw = yaml.safe_load(fh)
        elif suffix == ".json":
            raw = json.load(fh)
        elif suffix == ".toml":
            raw = tomllib.load(fh)
        else:
            raise ValueError(f"不支持的文件格式: {suffix}")
    return Dao.from_dict(raw)
