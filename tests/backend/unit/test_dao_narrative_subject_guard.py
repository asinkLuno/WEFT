"""Spec 2: Narrative.from_dict subject 守门。

``subject`` 必须是字符串列表；非 list 或含非 str 元素抛
``SchemaError NARRATIVE_SUBJECT_INVALID``。空列表合法（语义：narrative 不选
任何 drift；这是边界但当前契约允许）。
"""

from __future__ import annotations

import pytest

from weft_backend.aqueduct import gregorian_aqueduct
from weft_backend.dao import Moai, Narrative
from weft_backend.errors import SchemaError


def _registry(*names: str) -> dict:
    return {
        name: Moai.from_dict(name, {"description": "D"}, gregorian_aqueduct)
        for name in names
    }


@pytest.mark.unit
@pytest.mark.parametrize(
    "subject_value",
    [
        None,  # 显式 None（data.get 在 key 存在时返回 None）
        "season_1",  # str 不是 list
        42,  # int
        ["season_1", 1],  # 含非 str
        [None],  # 含 None
    ],
)
def test_invalid_subject_raises_narrative_subject_invalid(subject_value) -> None:
    with pytest.raises(SchemaError) as exc_info:
        Narrative.from_dict(
            data={"subject": subject_value, "observer": "guojing"},
            drifts={},
            moais=_registry("guojing"),
        )
    err = exc_info.value
    assert err.code == "NARRATIVE_SUBJECT_INVALID"
    assert err.path == ("narrative", "subject")


@pytest.mark.unit
def test_empty_subject_list_does_not_raise_subject_invalid():
    # 空列表通过守门；语义是 narrative 不引用任何 drift。后续若加业务约束
    # （"至少要有一个 subject"），应在新分支里加，不动本守门。
    try:
        Narrative.from_dict(
            data={"subject": [], "observer": "guojing"},
            drifts={},
            moais=_registry("guojing"),
        )
    except SchemaError as exc:
        if exc.code == "NARRATIVE_SUBJECT_INVALID":
            raise AssertionError("空 subject 列表不应触发守门") from exc
