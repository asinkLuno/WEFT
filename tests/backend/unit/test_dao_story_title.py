"""Spec 7: Story.from_dict title 必须是字符串。

``title`` 是 ``Story`` 的必填字段且必须是字符串。YAML 里写 ``title: 123`` 或
干脆漏掉都会触发 ``STORY_TITLE_INVALID``，path 固定到 ``("story", "title")``。
"""

from __future__ import annotations

import pytest

from weft_backend.dao import Story
from weft_backend.errors import SchemaError


@pytest.mark.unit
@pytest.mark.parametrize(
    "data",
    [
        {},  # 缺 title
        {"title": None},  # 显式 None
        {"title": 123},  # int
        {"title": ["T"]},  # list
        {"title": {"value": "T"}},  # dict
    ],
)
def test_non_string_title_raises_story_title_invalid(data: dict) -> None:
    with pytest.raises(SchemaError) as exc_info:
        Story.from_dict(data)
    assert exc_info.value.code == "STORY_TITLE_INVALID"
    assert exc_info.value.path == ("story", "title")
