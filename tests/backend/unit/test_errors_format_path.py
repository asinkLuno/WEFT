"""Spec 2: format_error_path 渲染规则。

渲染契约：
- 空 path → 空字符串
- 首段是字符串 → 直接拼
- 首段是 int → ``[i]`` 形式（无前导点）
- 后续字符串段 → ``.seg``
- 后续 int 段 → ``[i]``（无前导点）

混合形式：``("moai", "guojing", 0, "base_time") → "moai.guojing[0].base_time"``
"""

from __future__ import annotations

import pytest

from weft_backend.errors import format_error_path


@pytest.mark.unit
@pytest.mark.parametrize(
    "path, expected",
    [
        ((), ""),
        (("foo",), "foo"),
        ((0,), "[0]"),
        (("foo", "bar"), "foo.bar"),
        (("foo", 0), "foo[0]"),
        (("foo", 0, "bar"), "foo[0].bar"),
        ((0, "foo"), "[0].foo"),
        (("moai", "guojing", 0, "base_time"), "moai.guojing[0].base_time"),
        (("story", "moais", 2, "base_time", 1), "story.moais[2].base_time[1]"),
    ],
)
def test_format_error_path(path: tuple, expected: str) -> None:
    assert format_error_path(path) == expected
