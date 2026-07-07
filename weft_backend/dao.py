from __future__ import annotations

from typing import Literal

import yaml
from pydantic import BaseModel, computed_field

from weft_backend.aqueduct import Phase, gregorian_aqueduct


# ── Phase: YAML time-list → Phase ───────────────────────────────────


def _phase(data: list) -> Phase:
    """Parse a YAML time list ``[*base, ref?]`` into a Phase.

    Leading ints are ``base_time`` (the offset, 6 wide for gregorian); an
    optional trailing list is ``ref_time`` (recursively another time list,
    the point the offset is relative to). The two compose later via
    ``Aqueduct.de_recursive``.
    """
    *base, tail = data
    if isinstance(tail, list):  # [*base, ref]
        return Phase(base_time=base, ref_time=_phase(tail))
    return Phase(base_time=list(data))  # [*base] (no ref)


# ── Models ──────────────────────────────────────────────────────────


class Moai(BaseModel):
    full_name: str
    base_time: Phase | None = None
    description: str
    extra_props: dict | None = None

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
    title: str
    start_time: Phase
    end_time: Phase | None = None
    description: str | None = None
    moais: list[Moai] | None = None
    moai_offsets: dict[str, dict[str, str | None]] | None = None

    @computed_field  # type: ignore[prop-decorator]
    @property
    def flat_start(self) -> list[int]:
        return gregorian_aqueduct.de_recursive(self.start_time)

    @computed_field  # type: ignore[prop-decorator]
    @property
    def flat_end(self) -> list[int] | None:
        return gregorian_aqueduct.de_recursive(self.end_time) if self.end_time else None

    @classmethod
    def from_yaml(cls, data: dict, moais: dict[str, Moai]) -> Drift:
        moai_names = data.get("moais", [])
        for name in moai_names:
            if name not in moais:
                raise KeyError(f"drift 引用了不存在的 moai: {name!r}")

        start_flat = gregorian_aqueduct.de_recursive(_phase(data["start_time"]))
        end_flat = (
            gregorian_aqueduct.de_recursive(_phase(data["end_time"]))
            if "end_time" in data
            else None
        )

        # ponytail: compute each moai's age at this drift event
        offsets: dict[str, dict[str, str | None]] = {}
        for name in moai_names:
            moai = moais[name]
            if moai.base_time is None:
                continue
            moai_flat = gregorian_aqueduct.de_recursive(moai.base_time)
            entry: dict[str, str | None] = {
                "start": gregorian_aqueduct.humanize(
                    gregorian_aqueduct.normalize(
                        gregorian_aqueduct.minus(start_flat, moai_flat)
                    )
                )
            }
            if end_flat is not None:
                entry["end"] = gregorian_aqueduct.humanize(
                    gregorian_aqueduct.normalize(
                        gregorian_aqueduct.minus(end_flat, moai_flat)
                    )
                )
            else:
                entry["end"] = None
            offsets[name] = entry

        return cls(
            title=data["title"],
            start_time=_phase(data["start_time"]),
            end_time=_phase(data["end_time"]) if "end_time" in data else None,
            description=data.get("description"),
            moais=[moais[m] for m in moai_names] if moai_names else None,
            moai_offsets=offsets or None,
        )


class Dao(BaseModel):
    story: Story
    moai: dict[str, Moai] | None = None
    moai_link: dict[str, list[MoaiLink]] | None = None
    drift: dict[str, list[Drift]] | None = None

    @classmethod
    def from_yaml(cls, raw: dict) -> Dao:
        # Moai first: links and drifts reference moais by name.
        moais = {name: Moai.from_yaml(m) for name, m in raw.get("moai", {}).items()}
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


if __name__ == "__main__":  # ponytail: smallest check that the parser holds
    assert _phase([1, 2, 3, 4, 5, 6]).base_time == [1, 2, 3, 4, 5, 6]
    with_ref = _phase([1, 2, 3, 4, 5, 6, [1, 2, 3, 4, 5, 6]])
    assert with_ref.base_time == [1, 2, 3, 4, 5, 6]
    assert with_ref.ref_time.base_time == [1, 2, 3, 4, 5, 6]
    # de_recursive unfolds the ref; normalize + humanize render it
    flat = gregorian_aqueduct.de_recursive(
        _phase([0, 4, 2, 0, 0, 0, [10, 0, 0, 0, 0, 0]])
    )
    assert (
        gregorian_aqueduct.humanize(gregorian_aqueduct.normalize(flat))
        == "10Y4M2D0H0m0s"
    )
    print("ok")
