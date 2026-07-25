"""Spec 3: Drift.from_dict moais 守门。

``moais`` 必须是字符串列表；非 list 或含非 str 元素都抛
``SchemaError DRIFT_MOAIS_INVALID``，path 钉到 ``("drift", group, title, "moais")``。
合法形态：缺省（等价于 []）或 []（归一为 None，在 Spec 1 已覆盖）。
"""

from __future__ import annotations

import pytest

from weft_backend.aqueduct import gregorian_aqueduct
from weft_backend.dao import Drift
from weft_backend.errors import SchemaError


@pytest.mark.unit
@pytest.mark.parametrize(
    "moais_value",
    [
        None,  # 显式 None
        "guojing",  # str 不是 list
        42,  # int
        ["guojing", 1],  # 含非 str
        [None],  # 含 None
        [1, 2, 3],  # 全 int
    ],
)
def test_invalid_moais_raises_drift_moais_invalid(moais_value) -> None:
    with pytest.raises(SchemaError) as exc_info:
        Drift.from_dict(
            group="season_1",
            title="event_x",
            data={"start_time": [2024], "moais": moais_value},
            moais={},
            aqueduct=gregorian_aqueduct,
        )
    err = exc_info.value
    assert err.code == "DRIFT_MOAIS_INVALID"
    assert err.path == ("drift", "season_1", "event_x", "moais")


@pytest.mark.unit
def test_moais_path_uses_group_and_title_correctly():
    # 不同 group/title 应反映到 path 里，不写死。
    with pytest.raises(SchemaError) as exc_info:
        Drift.from_dict(
            group="other_season",
            title="other_event",
            data={"start_time": [2024], "moais": "name"},
            moais={},
            aqueduct=gregorian_aqueduct,
        )
    assert exc_info.value.path == ("drift", "other_season", "other_event", "moais")
