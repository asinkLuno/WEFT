from __future__ import annotations

import json
import tomllib
from collections.abc import Mapping
from functools import cached_property
from pathlib import Path
from typing import Any, cast

import yaml
from pydantic import BaseModel, Field, ValidationError, computed_field
from yaml.constructor import ConstructorError

from weft_backend.aqueduct import AQUEDUCTS, Aqueduct, Phase, load_user_aqueducts
from weft_backend.errors import (
    ErrorPath,
    PluginError,
    ReferenceError,
    SchemaError,
    TimelineError,
    WeftError,
    normalize_error,
    validation_error,
)
from weft_backend.material import MATERIALS, load_user_materials

# ── Phase: YAML time-list → Phase ───────────────────────────────────


RawMapping = Mapping[str, Any]

_BaseYamlSafeLoader: Any = getattr(
    yaml,
    "CSafeLoader",
    yaml.SafeLoader,
)


class _YamlSafeLoader(_BaseYamlSafeLoader):
    """Safe loader that rejects keys PyYAML would otherwise overwrite."""

    def construct_mapping(self, node: yaml.MappingNode, deep: bool = False) -> dict:
        seen: set[object] = set()
        for key_node, _ in node.value:
            key = self.construct_object(key_node, deep=deep)
            if key in seen:
                raise ConstructorError(
                    "while constructing a mapping",
                    node.start_mark,
                    f"found duplicate key {key!r}",
                    key_node.start_mark,
                )
            seen.add(key)
        return super().construct_mapping(node, deep=deep)


def _mapping(value: object, path: ErrorPath) -> RawMapping:
    if not isinstance(value, Mapping):
        raise SchemaError(
            "MAPPING_EXPECTED",
            "此字段必须是映射",
            path=path,
            details={"actual_type": type(value).__name__},
        )
    return cast(RawMapping, value)


def _phase(
    data: object,
    aqueduct: Aqueduct,
    *,
    path: ErrorPath = (),
) -> Phase:
    """Parse a YAML time list ``[*base, ref?]`` into a Phase.

    Leading ints are ``base_time`` ; an optional trailing list is ``ref_time``
    (recursively another time list, the point the offset is relative to).
    Short base_time arrays are zero-padded to the aqueduct brick count.
    """
    n = len(aqueduct.bricks)
    if not isinstance(data, list) or not data:
        raise SchemaError(
            "TIME_NOT_LIST",
            "时间必须是非空列表",
            path=path,
            hint="使用 [年, 月, 日, 时, 分, 秒]；末尾分量可以省略",
        )
    *base, tail = data
    if isinstance(tail, list):  # [*base, ref]
        if len(base) > n or not all(type(value) is int for value in base):
            raise SchemaError(
                "TIME_OFFSET_INVALID",
                f"时间偏移必须包含至多 {n} 个整数",
                path=path,
                details={"expected_max_length": n},
            )
        integer_base = cast(list[int], base)
        return Phase(
            base_time=integer_base + [0] * (n - len(integer_base)),
            ref_time=_phase(tail, aqueduct, path=path + ("ref_time",)),
        )
    if len(data) > n or not all(type(value) is int for value in data):
        raise SchemaError(
            "TIME_VALUE_INVALID",
            f"时间必须包含至多 {n} 个整数",
            path=path,
            details={"expected_max_length": n},
        )
    base = cast(list[int], data) + [0] * (n - len(data))
    return Phase(base_time=base)


# ── Models ──────────────────────────────────────────────────────────


class Moai(BaseModel):
    model_config = {"arbitrary_types_allowed": True}

    name: str
    base_time: Phase | None = None
    description: str
    materials: list[str] = Field(default_factory=list)
    extra_props: dict[str, Any] | None = None
    aqueduct: Aqueduct = Field(exclude=True)
    journal: dict[str, tuple[str, str | None]] = Field(default_factory=dict)

    def apply_material(self, name: str) -> Any:
        """应用单个 material 函数，返回计算出的派生属性。

        material 接收 Moai 实例，可读取任意属性（base_time, extra_props 等）。
        当前支持的 material 见 :mod:`weft_backend.material` 的 ``MATERIALS`` 注册表。
        """

        fn = MATERIALS.get(name)
        if fn is None:
            raise ReferenceError(
                "MATERIAL_NOT_FOUND",
                f"未知的 material: {name!r}",
                path=("moai", self.name, "materials"),
                details={"material": name},
            )
        return fn(self)

    @computed_field  # type: ignore[prop-decorator]
    @cached_property
    def base_time_display(self) -> str | None:
        if self.base_time is None:
            return None
        flat = self.aqueduct.de_recursive(self.base_time)
        return self.aqueduct.humanize(self.aqueduct.normalize(flat))

    @classmethod
    def from_dict(cls, name: str, data: RawMapping, aqueduct: Aqueduct) -> Moai:
        known = set(cls.model_fields)
        extra = {k: v for k, v in data.items() if k not in known}
        moai = cls(
            name=name,
            base_time=_phase(
                data["base_time"],
                aqueduct,
                path=("moai", name, "base_time"),
            )
            if "base_time" in data
            else None,
            description=data.get("description", ""),
            materials=data.get("materials", []),
            extra_props=extra or None,
            aqueduct=aqueduct,
        )
        # 解析时计算 materials，结果写入 extra_props
        try:
            if moai.materials:
                computed = {
                    name: moai.apply_material(name) for name in moai.materials
                }
                moai.extra_props = {**(moai.extra_props or {}), **computed}
        except WeftError:
            raise
        except Exception as exc:
            raise PluginError(
                "MATERIAL_EVALUATION_FAILED",
                f"moai {name!r} 的 material 计算失败",
                path=("moai", name, "materials"),
                details={
                    "exception_type": type(exc).__name__,
                    "reason": str(exc),
                },
            ) from exc
        return moai


class MoaiLink(BaseModel):
    moais: tuple[Moai, Moai]
    relations: str
    bidirectional: bool

    @classmethod
    def from_dict(
        cls,
        data: RawMapping,
        moais: Mapping[str, Moai],
        *,
        path: ErrorPath = ("moai_link",),
    ) -> MoaiLink:
        targets = data.get("moais")
        if (
            not isinstance(targets, list)
            or len(targets) != 2
            or not all(isinstance(name, str) for name in targets)
        ):
            raise SchemaError(
                "MOAI_LINK_TARGETS_INVALID",
                "moai_link.moais 必须恰好包含两个 moai 名称",
                path=path + ("moais",),
            )
        a, b = targets
        for name in (a, b):
            if name not in moais:
                raise ReferenceError(
                    "MOAI_LINK_TARGET_NOT_FOUND",
                    f"moai_link 引用了不存在的 moai: {name!r}",
                    path=path + ("moais",),
                    details={"moai": name},
                )
        if "relations" not in data:
            raise SchemaError(
                "MOAI_LINK_RELATIONS_REQUIRED",
                "moai_link.relations 是必填字段",
                path=path + ("relations",),
            )
        try:
            return cls(
                moais=(moais[a], moais[b]),
                relations=data["relations"],
                bidirectional=data.get("bidirectional", True),
            )
        except ValidationError as exc:
            raise validation_error(
                exc,
                path=path,
                code="MOAI_LINK_INVALID",
            ) from exc


class Story(BaseModel):
    title: str
    description: str | None = None
    date_mode: str

    @classmethod
    def from_dict(cls, data: RawMapping) -> Story:
        title = data.get("title")
        if not isinstance(title, str):
            raise SchemaError(
                "STORY_TITLE_INVALID",
                "story.title 必须是字符串",
                path=("story", "title"),
            )
        return cls(
            title=title,
            description=data.get("description"),
            date_mode=data.get("date_mode", "gregorian"),
        )


class Drift(BaseModel):
    model_config = {"arbitrary_types_allowed": True}

    id: str
    title: str = Field(max_length=20)
    start_time: Phase
    end_time: Phase | None = None
    description: str | None = None
    moais: list[str] | None = None
    aqueduct: Aqueduct = Field(exclude=True)

    @computed_field  # type: ignore[prop-decorator]
    @cached_property
    def flat_start(self) -> list[int]:
        return self.aqueduct.de_recursive(self.start_time)

    @computed_field  # type: ignore[prop-decorator]
    @cached_property
    def flat_end(self) -> list[int] | None:
        return self.aqueduct.de_recursive(self.end_time) if self.end_time else None

    @computed_field  # type: ignore[prop-decorator]
    @cached_property
    def start_tick(self) -> int:
        return self.aqueduct.to_tick(self.flat_start)

    @computed_field  # type: ignore[prop-decorator]
    @cached_property
    def end_tick(self) -> int | None:
        return self.aqueduct.to_tick(self.flat_end) if self.flat_end else None

    @computed_field  # type: ignore[prop-decorator]
    @cached_property
    def start_time_display(self) -> str:
        return self.aqueduct.humanize(self.flat_start)

    @computed_field  # type: ignore[prop-decorator]
    @cached_property
    def end_time_display(self) -> str | None:
        return self.aqueduct.humanize(self.flat_end) if self.flat_end else None

    @classmethod
    def from_dict(
        cls,
        group: str,
        title: str,
        data: RawMapping,
        moais: Mapping[str, Moai],
        aqueduct: Aqueduct,
    ) -> Drift:
        moai_names = data.get("moais", [])
        if not isinstance(moai_names, list) or not all(
            isinstance(name, str) for name in moai_names
        ):
            raise SchemaError(
                "DRIFT_MOAIS_INVALID",
                "drift.moais 必须是 moai 名称列表",
                path=("drift", group, title, "moais"),
            )
        for name in moai_names:
            if name not in moais:
                raise ReferenceError(
                    "DRIFT_MOAI_NOT_FOUND",
                    f"drift 引用了不存在的 moai: {name!r}",
                    path=("drift", group, title, "moais"),
                    details={"moai": name},
                )
        path = ("drift", group, title)
        if "start_time" not in data:
            raise SchemaError(
                "DRIFT_START_REQUIRED",
                "drift.start_time 是必填字段",
                path=path + ("start_time",),
            )
        try:
            drift = cls(
                id=f"{group}/{title}",
                title=title,
                start_time=_phase(
                    data["start_time"],
                    aqueduct,
                    path=path + ("start_time",),
                ),
                end_time=_phase(
                    data["end_time"],
                    aqueduct,
                    path=path + ("end_time",),
                )
                if "end_time" in data
                else None,
                description=data.get("description"),
                moais=moai_names or None,
                aqueduct=aqueduct,
            )
        except ValidationError as exc:
            raise validation_error(exc, path=path, code="DRIFT_INVALID") from exc
        try:
            end_tick = drift.end_tick
            start_tick = drift.start_tick if end_tick is not None else None
        except NotImplementedError as exc:
            raise PluginError(
                "AQUEDUCT_TICK_UNAVAILABLE",
                "当前历法没有提供 Drift 时间轴所需的 to_tick",
                path=path + ("start_time",),
                hint="在 Aqueduct 插件中提供 to_tick(values) 转换函数",
            ) from exc
        except Exception as exc:
            raise PluginError(
                "AQUEDUCT_CALCULATION_FAILED",
                f"历法计算 drift {drift.id!r} 时失败",
                path=path + ("start_time",),
                details={
                    "exception_type": type(exc).__name__,
                    "reason": str(exc),
                },
            ) from exc
        if (
            end_tick is not None
            and start_tick is not None
            and end_tick < start_tick
        ):
            raise TimelineError(
                "DRIFT_END_BEFORE_START",
                f"drift {drift.id!r} 的 end_time 不能早于 start_time",
                path=path + ("end_time",),
                details={"drift_id": drift.id},
            )

        return drift


class Narrative(BaseModel):
    """A chapter outline selecting drift groups or individual events."""

    subject: list[str]
    observer: str
    drifts: list[Drift]

    @classmethod
    def from_dict(
        cls,
        data: RawMapping,
        drifts: Mapping[str, list[Drift]],
        moais: Mapping[str, Moai],
    ) -> Narrative:
        subject = data.get("subject", [])
        observer = data.get("observer")
        if not isinstance(subject, list) or not all(
            isinstance(name, str) for name in subject
        ):
            raise SchemaError(
                "NARRATIVE_SUBJECT_INVALID",
                "narrative.subject 必须是 drift 分组或事件 ID 列表",
                path=("narrative", "subject"),
            )
        if not isinstance(observer, str):
            raise SchemaError(
                "NARRATIVE_OBSERVER_INVALID",
                "narrative.observer 必须是 moai 名称",
                path=("narrative", "observer"),
            )
        if observer not in moais:
            raise ReferenceError(
                "NARRATIVE_OBSERVER_NOT_FOUND",
                f"narrative 引用了不存在的 observer moai: {observer!r}",
                path=("narrative", "observer"),
                details={"observer": observer},
            )

        drifts_by_id = {
            drift.id: drift for events in drifts.values() for drift in events
        }
        narrative_drifts: list[Drift] = []
        for reference in subject:
            if reference in drifts:
                referenced_drifts = drifts[reference]
            elif reference in drifts_by_id:
                referenced_drifts = [drifts_by_id[reference]]
            else:
                raise ReferenceError(
                    "NARRATIVE_SUBJECT_NOT_FOUND",
                    f"narrative 引用了不存在的 drift 分组或事件: {reference!r}",
                    path=("narrative", "subject"),
                    details={"subject": reference},
                )
            narrative_drifts.extend(
                drift.model_copy(deep=True) for drift in referenced_drifts
            )

        observer_absences = [
            drift.id
            for drift in narrative_drifts
            if observer not in (drift.moais or ())
        ]
        if observer_absences:
            formatted_ids = ", ".join(repr(drift_id) for drift_id in observer_absences)
            raise ReferenceError(
                "NARRATIVE_OBSERVER_ABSENT",
                f"narrative observer {observer!r} 未在以下事件中在场: {formatted_ids}",
                path=("narrative", "observer"),
                details={
                    "observer": observer,
                    "drift_ids": observer_absences,
                },
            )

        return cls(subject=subject, observer=observer, drifts=narrative_drifts)


def _record_moai_drift_time(
    moai: Moai,
    drift: Drift,
    aqueduct: Aqueduct,
    moai_base: list[int],
    drift_start: list[int],
    drift_end: list[int] | None,
) -> None:
    """Store a drift's start/end offsets from a moai's base time."""
    start = aqueduct.normalize(aqueduct.minus(drift_start, moai_base))
    end = (
        aqueduct.normalize(aqueduct.minus(drift_end, moai_base))
        if drift_end is not None
        else None
    )
    moai.journal[drift.id] = (
        aqueduct.humanize(start),
        aqueduct.humanize(end) if end is not None else None,
    )


def _populate_journals(
    moais: Mapping[str, Moai],
    drifts: Mapping[str, list[Drift]],
    aqueduct: Aqueduct,
) -> None:
    """Populate journals after all models and references have been resolved."""
    moai_bases = {
        name: aqueduct.de_recursive(moai.base_time)
        for name, moai in moais.items()
        if moai.base_time is not None
    }
    for events in drifts.values():
        for drift in events:
            drift_start = drift.flat_start
            drift_end = drift.flat_end
            for moai_name in drift.moais or ():
                moai_base = moai_bases.get(moai_name)
                if moai_base is None:
                    continue
                _record_moai_drift_time(
                    moais[moai_name],
                    drift,
                    aqueduct,
                    moai_base,
                    drift_start,
                    drift_end,
                )


class Dao(BaseModel):
    story: Story
    moai: dict[str, Moai] = Field(default_factory=dict)
    moai_link: dict[str, list[MoaiLink]] = Field(default_factory=dict)
    drift: dict[str, list[Drift]] = Field(default_factory=dict)
    narrative: dict[str, Narrative] = Field(default_factory=dict)

    @classmethod
    def from_dict(cls, raw: RawMapping) -> Dao:
        story_raw = _mapping(raw.get("story", {}), ("story",))
        date_mode = story_raw.get("date_mode", "gregorian")
        if not isinstance(date_mode, str):
            raise SchemaError(
                "DATE_MODE_INVALID",
                "story.date_mode 必须是字符串",
                path=("story", "date_mode"),
            )
        try:
            aqueduct = AQUEDUCTS[date_mode]
        except KeyError as exc:
            raise ReferenceError(
                "AQUEDUCT_NOT_FOUND",
                f"不支持的 date_mode: {date_mode!r}",
                path=("story", "date_mode"),
                details={"date_mode": date_mode},
            ) from exc

        # Moai first: links and drifts reference moais by name.
        moai_raw = _mapping(raw.get("moai", {}), ("moai",))
        moais = {}
        for name, raw_data in moai_raw.items():
            if not isinstance(name, str):
                raise SchemaError(
                    "MOAI_NAME_INVALID",
                    "moai 名称必须是字符串",
                    path=("moai",),
                )
            data = _mapping(raw_data, ("moai", name))
            try:
                moais[name] = Moai.from_dict(name, data, aqueduct)
            except ValidationError as exc:
                raise validation_error(
                    exc,
                    path=("moai", name),
                    code="MOAI_INVALID",
                ) from exc
        drift_raw = dict(_mapping(raw.get("drift", {}), ("drift",)))
        # Backward compatibility for files that initially placed narrative
        # below drift. A top-level narrative takes precedence.
        nested_narrative_raw = drift_raw.pop("narrative", {})
        narrative_raw = raw.get("narrative", nested_narrative_raw)
        drifts: dict[str, list[Drift]] = {}
        for season, raw_events in drift_raw.items():
            if not isinstance(season, str):
                raise SchemaError(
                    "DRIFT_GROUP_INVALID",
                    "drift 分组名必须是字符串",
                    path=("drift",),
                )
            events = _mapping(raw_events, ("drift", season))
            parsed_events = []
            for title, data in events.items():
                if not isinstance(title, str):
                    raise SchemaError(
                        "DRIFT_TITLE_INVALID",
                        "drift 事件标题必须是字符串",
                        path=("drift", season),
                    )
                parsed_events.append(
                    Drift.from_dict(
                        season,
                        title,
                        _mapping(data, ("drift", season, title)),
                        moais,
                        aqueduct,
                    )
                )
            drifts[season] = parsed_events
        # 按各 season 最早 drift 的 start_time 排序
        if drifts:
            drifts = dict(
                sorted(
                    drifts.items(),
                    key=lambda item: (
                        not item[1],
                        min((d.flat_start for d in item[1]), default=[]),
                    ),
                )
            )
        narratives = {}
        narrative_mapping = _mapping(narrative_raw, ("narrative",))
        for name, raw_data in narrative_mapping.items():
            if not isinstance(name, str):
                raise SchemaError(
                    "NARRATIVE_NAME_INVALID",
                    "narrative 名称必须是字符串",
                    path=("narrative",),
                )
            data = _mapping(raw_data, ("narrative", name))
            try:
                narratives[name] = Narrative.from_dict(data, drifts, moais)
            except WeftError as exc:
                if exc.path[:1] == ("narrative",):
                    exc.path = ("narrative", name) + exc.path[1:]
                raise
            except ValidationError as exc:
                raise validation_error(
                    exc,
                    path=("narrative", name),
                    code="NARRATIVE_INVALID",
                ) from exc
        _populate_journals(moais, drifts, aqueduct)
        moai_links: dict[str, list[MoaiLink]] = {}
        link_mapping = _mapping(raw.get("moai_link", {}), ("moai_link",))
        for label, raw_links in link_mapping.items():
            if not isinstance(label, str):
                raise SchemaError(
                    "MOAI_LINK_GROUP_INVALID",
                    "moai_link 分组名必须是字符串",
                    path=("moai_link",),
                )
            if not isinstance(raw_links, list):
                raise SchemaError(
                    "MOAI_LINK_LIST_EXPECTED",
                    "moai_link 分组必须是关系列表",
                    path=("moai_link", label),
                )
            moai_links[label] = [
                MoaiLink.from_dict(
                    _mapping(link, ("moai_link", label, index)),
                    moais,
                    path=("moai_link", label, index),
                )
                for index, link in enumerate(raw_links)
            ]
        try:
            story = Story.from_dict(story_raw)
        except ValidationError as exc:
            raise validation_error(
                exc,
                path=("story",),
                code="STORY_INVALID",
            ) from exc
        try:
            return cls(
                story=story,
                moai=moais,
                moai_link=moai_links,
                drift=drifts,
                narrative=narratives,
            )
        except ValidationError as exc:
            raise validation_error(exc, code="DAO_INVALID") from exc


# ── Public API ──────────────────────────────────────────────────────


def load_dao(path: str | Path) -> Dao:
    """Load a story file and return a fully-resolved ``Dao``.

    Format is detected from the file extension: ``.yaml`` / ``.yml`` (YAML),
    ``.json`` (JSON), ``.toml`` (TOML).
    """
    source = Path(path)
    try:
        suffix = source.suffix.lower()
        if suffix == ".toml":
            with source.open("rb") as fh:
                raw = tomllib.load(fh)
        elif suffix in {".yaml", ".yml"}:
            with source.open(encoding="utf-8") as fh:
                raw = yaml.load(fh, Loader=_YamlSafeLoader)
        elif suffix == ".json":
            with source.open(encoding="utf-8") as fh:
                raw = json.load(fh)
        else:
            raise SchemaError(
                "FILE_FORMAT_UNSUPPORTED",
                f"不支持的文件格式: {suffix}",
                details={"suffix": suffix},
            )
        if not isinstance(raw, Mapping):
            raise SchemaError(
                "ROOT_NOT_MAPPING",
                "故事文件的顶层必须是映射",
                path=(),
            )
        # Plugins must be loaded before Dao.from_dict: parsing immediately
        # resolves the selected calendar and computes materials.
        load_user_aqueducts(raw.get("aqueduct", {}), source.parent)
        load_user_materials(raw.get("material", {}), source.parent)
        return Dao.from_dict(raw)
    except Exception as exc:
        error = normalize_error(exc, source)
        if error is exc:
            raise
        raise error from exc
