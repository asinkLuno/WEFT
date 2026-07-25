"""Spec 1: Drift.from_dict 最小合法输入。

``id`` 由 ``{group}/{title}`` 拼成；空 moais 列表归一为 None（语义：未声明
参与者）；``description`` 缺省 None；``end_time`` 缺省 None；``start_time``
通过 ``_phase`` 解析（含零填充）。本文件只覆盖快乐路径与默认值契约。
"""

from __future__ import annotations

import pytest

from weft_backend.aqueduct import gregorian_aqueduct
from weft_backend.dao import Drift


@pytest.mark.unit
class TestDriftFromDictHappy:
    def test_minimal_payload(self):
        drift = Drift.from_dict(
            group="season_1",
            title="event_x",
            data={"start_time": [2024, 1, 1]},
            moais={},
            aqueduct=gregorian_aqueduct,
        )
        assert drift.id == "season_1/event_x"
        assert drift.title == "event_x"
        assert drift.start_time.base_time == [2024, 1, 1, 0, 0, 0]
        assert drift.start_time.ref_time is None
        assert drift.end_time is None
        assert drift.description is None
        assert drift.moais is None

    def test_empty_moais_list_normalizes_to_none(self):
        # moai_names or None —— 写 [] 与不写等价。
        drift = Drift.from_dict(
            group="g",
            title="t",
            data={"start_time": [2024], "moais": []},
            moais={},
            aqueduct=gregorian_aqueduct,
        )
        assert drift.moais is None

    def test_explicit_description_preserved(self):
        drift = Drift.from_dict(
            group="g",
            title="t",
            data={"start_time": [2024], "description": "boom"},
            moais={},
            aqueduct=gregorian_aqueduct,
        )
        assert drift.description == "boom"

    def test_moai_names_attached_when_resolved(self):
        # 单个 moai 解析成功后，名字列表挂在 drift.moais 上（不是 Moai 实例）。
        # 构造一个最小 moai 透传：用最小 dict 让 Moai.from_dict 过校验。
        from weft_backend.dao import Moai

        moais = {"guojing": Moai.from_dict("guojing", {"description": "D"}, gregorian_aqueduct)}
        drift = Drift.from_dict(
            group="g",
            title="t",
            data={"start_time": [2024], "moais": ["guojing"]},
            moais=moais,
            aqueduct=gregorian_aqueduct,
        )
        assert drift.moais == ["guojing"]
