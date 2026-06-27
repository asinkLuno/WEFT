from __future__ import annotations

from typing import Annotated, TypeAlias

from pydantic import BaseModel, Field

# FIXME: 这里最大长度应该从配置里面取
# 六位分别代表：年月日时分秒
TimeUnit: TypeAlias = Annotated[list[int], Field(min_length=1, max_length=6)]


def plus_time_unit(tu1: TimeUnit, tu2: TimeUnit):
    res = [i + j for i, j in zip(tu1, tu2)]
    return res


class BaseTime(BaseModel):
    core_time: TimeUnit
    phase: Phase | None = None


class Phase(BaseModel):
    base_time: BaseTime
    ref_time: int | TimeUnit | None = None
    base_time_name: str | None = None
