"""Spec 1: Aqueduct.validate_time_unit 守门行为。

只覆盖三类非法输入，合法路径在其它 spec 里通过 normalize/plus 间接走通。
"""

from __future__ import annotations

import pytest

from weft_backend.aqueduct import gregorian_aqueduct


@pytest.mark.unit
class TestValidateTimeUnit:
    def test_rejects_str(self):
        # 字符串虽然是 Sequence，但对时间单位没有意义；显式拒绝。
        with pytest.raises(ValueError, match="期望整数序列"):
            gregorian_aqueduct.validate_time_unit("20240101")

    def test_rejects_wrong_length(self):
        # bricks 是 6 位（年/月/日/时/分/秒）；5 位应拒绝。
        with pytest.raises(ValueError, match="长度应为 6"):
            gregorian_aqueduct.validate_time_unit([2024, 1, 1, 0, 0])

    def test_rejects_non_int_elements(self):
        # bool 是 int 的子类，但语义上不是时间分量；用 type() is int 严格判定。
        with pytest.raises(ValueError, match="元素应全为 int"):
            gregorian_aqueduct.validate_time_unit([2024, 1, 1, 0, 0, 0.5])

    def test_rejects_bool_elements(self):
        with pytest.raises(ValueError, match="元素应全为 int"):
            gregorian_aqueduct.validate_time_unit([True, 1, 1, 0, 0, 0])
