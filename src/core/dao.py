from __future__ import annotations

from typing import Literal

from pydantic import BaseModel

from .phase import Phase


class Moai(BaseModel):
    full_name: str
    base_time: Phase
    description: str
    extra_props: dict | None = None


class MoaiLink(BaseModel):
    moais: tuple[Moai, Moai]
    relations: str
    bidirectional: bool = True


class Story(BaseModel):
    title: str
    summary: str | None = None
    description: str | None = None
    date_mode: Literal["gregorian", "chinese"]


class Drift(BaseModel):
    title: str
    start_time: Phase
    end_time: Phase | None = None
    description: str | None = None
    moais: list[Moai] | None = None


class Narrative(BaseModel):
    subject: list[str] | None = None
    observe: list[str] | None = None


class Dao(BaseModel):
    story: Story
    moai: dict[str, Moai] | None = None
    moai_link: dict[str, list[MoaiLink]] | None = None
    drift: dict[str, list[Drift]] | None = None
    narrative: dict[str, Narrative] | None = None
