from __future__ import annotations

from typing import Literal

import yaml
from pydantic import BaseModel

from src.core.aqueduct import Phase


# ── Phase: YAML time-list → Phase ───────────────────────────────────


def _phase(data: list) -> Phase:
    """Parse a YAML time list ``[*base, ref?]`` into a Phase.

    Leading ints are ``base_time`` (the offset, 6 wide for gregorian); an
    optional trailing list is ``ref_time`` (recursively another time list,
    the point the offset is relative to). The two compose later via
    ``Aqueduct.de_recursive``.
    """
    *base, tail = data
    if isinstance(tail, list):            # [*base, ref]
        return Phase(base_time=base, ref_time=_phase(tail))
    return Phase(base_time=list(data))    # [*base] (no ref)


# ── Models ──────────────────────────────────────────────────────────


class Moai(BaseModel):
    full_name: str
    base_time: Phase | None = None
    description: str
    extra_props: dict | None = None

    @classmethod
    def from_yaml(cls, data: dict) -> Moai:
        known = set(cls.model_fields)
        extra = {k: v for k, v in data.items() if k not in known}
        return cls(
            full_name=data["full_name"],
            base_time=_phase(data["base_time"]) if "base_time" in data else None,
            description=data.get("description", ""),
            extra_props=extra or None,
        )


class MoaiLink(BaseModel):
    moais: tuple[Moai, Moai]
    relations: str
    bidirectional: bool = True

    @classmethod
    def from_yaml(cls, data: dict, moais: dict[str, Moai]) -> MoaiLink:
        a, b = data["moais"]
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
    title: str
    start_time: Phase
    end_time: Phase | None = None
    description: str | None = None
    moais: list[Moai] | None = None

    @classmethod
    def from_yaml(cls, data: dict, moais: dict[str, Moai]) -> Drift:
        return cls(
            title=data["title"],
            start_time=_phase(data["start_time"]),
            end_time=_phase(data["end_time"]) if "end_time" in data else None,
            description=data.get("description"),
            moais=[moais[m] for m in data["moais"]] if "moais" in data else None,
        )


class Narrative(BaseModel):
    subject: list[str] | None = None
    observe: list[str] | None = None

    @classmethod
    def from_yaml(cls, data: dict) -> Narrative:
        return cls(
            subject=data.get("subject"),
            observe=data.get("observer"),
        )


class Dao(BaseModel):
    story: Story
    moai: dict[str, Moai] | None = None
    moai_link: dict[str, list[MoaiLink]] | None = None
    drift: dict[str, list[Drift]] | None = None
    narrative: dict[str, Narrative] | None = None

    @classmethod
    def from_yaml(cls, raw: dict) -> Dao:
        # Moai first: links and drifts reference moais by name.
        moais = {name: Moai.from_yaml(m) for name, m in raw.get("moai", {}).items()}
        return cls(
            story=Story.from_yaml(raw.get("story", {})),
            moai=moais or None,
            moai_link={
                label: [MoaiLink.from_yaml(link, moais) for link in links]
                for label, links in raw.get("moai_link", {}).items()
            } or None,
            drift={
                season: [Drift.from_yaml(d, moais) for d in events]
                for season, events in raw.get("drift", {}).items()
            } or None,
            narrative={
                name: Narrative.from_yaml(n) for name, n in raw.get("narrative", {}).items()
            } or None,
        )


# ── Public API ──────────────────────────────────────────────────────


def load_dao(path: str) -> Dao:
    """Load a YAML file and return a fully-resolved ``Dao``."""
    with open(path) as fh:
        return Dao.from_yaml(yaml.safe_load(fh))


if __name__ == "__main__":  # ponytail: smallest check that the parser holds
    assert _phase([1, 2, 3, 4, 5, 6]).base_time == [1, 2, 3, 4, 5, 6]
    with_ref = _phase([1, 2, 3, 4, 5, 6, [1, 2, 3, 4, 5, 6]])
    assert with_ref.base_time == [1, 2, 3, 4, 5, 6]
    assert with_ref.ref_time.base_time == [1, 2, 3, 4, 5, 6]
    print("ok")
