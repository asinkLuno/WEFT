"""Spec 3: Narrative.from_dict observer 守门。

``observer`` 必须是字符串。缺省或非 str 抛 ``SchemaError NARRATIVE_OBSERVER_INVALID``。
注意 observer 校验在 subject 之后；如果 subject 已经非法，本分支不会触发。
"""

from __future__ import annotations

import pytest

from weft_backend.aqueduct import gregorian_aqueduct
from weft_backend.dao import Moai, Narrative
from weft_backend.errors import SchemaError


@pytest.mark.unit
@pytest.mark.parametrize(
    "observer_value",
    [
        None,  # 缺 observer 或显式 None
        42,  # int
        ["guojing"],  # list
        {"name": "guojing"},  # dict
    ],
)
def test_non_string_observer_raises_narrative_observer_invalid(observer_value) -> None:
    # subject 用合法空列表，确保进到 observer 分支。
    with pytest.raises(SchemaError) as exc_info:
        Narrative.from_dict(
            data={"subject": [], "observer": observer_value},
            drifts={},
            moais={},
        )
    err = exc_info.value
    assert err.code == "NARRATIVE_OBSERVER_INVALID"
    assert err.path == ("narrative", "observer")
