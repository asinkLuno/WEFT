"""Spec 6: Story.from_dict 完整字段 + 默认值。

`Story` 是顶层故事元信息：``title`` 必填，``description`` 与 ``date_mode``
都有默认。``date_mode`` 缺省 ``"gregorian"`` 是默认历法约定；``description``
缺省为 ``None``（调用方按 ``None`` 与 ``""`` 区分「未写」与「空描述」）。
"""

from __future__ import annotations

import pytest

from weft_backend.dao import Story


@pytest.mark.unit
class TestStoryFromDictDefaults:
    def test_full_payload(self):
        story = Story.from_dict(
            {"title": "T", "description": "D", "date_mode": "gregorian_en"}
        )
        assert story.title == "T"
        assert story.description == "D"
        assert story.date_mode == "gregorian_en"

    def test_description_defaults_to_none(self):
        story = Story.from_dict({"title": "T"})
        assert story.description is None

    def test_date_mode_defaults_to_gregorian(self):
        story = Story.from_dict({"title": "T"})
        assert story.date_mode == "gregorian"

    def test_explicit_description_none_preserved(self):
        # 调用方可以显式传 None 来标记「无描述」，区别于「字段未写」。
        story = Story.from_dict({"title": "T", "description": None})
        assert story.description is None

    def test_explicit_empty_string_description_preserved(self):
        # 空串与 None 在 UI 上可能区分；保留原样不归一化。
        story = Story.from_dict({"title": "T", "description": ""})
        assert story.description == ""
