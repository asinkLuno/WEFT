"""Moai material functions — 从 Moai 属性计算出派生属性。"""

from typing import Callable, Protocol

from weft_backend.aqueduct import Aqueduct, Phase


class MaterialTarget(Protocol):
    base_time: Phase | None
    aqueduct: Aqueduct

# (start_m, start_d), (end_m, end_d), name
_ZODIAC = (
    ((1, 20), (2, 18), "水瓶座"),
    ((2, 19), (3, 20), "双鱼座"),
    ((3, 21), (4, 19), "白羊座"),
    ((4, 20), (5, 20), "金牛座"),
    ((5, 21), (6, 21), "双子座"),
    ((6, 22), (7, 22), "巨蟹座"),
    ((7, 23), (8, 22), "狮子座"),
    ((8, 23), (9, 22), "处女座"),
    ((9, 23), (10, 23), "天秤座"),
    ((10, 24), (11, 22), "天蝎座"),
    ((11, 23), (12, 21), "射手座"),
    ((12, 22), (1, 19), "摩羯座"),
)


def constellation(moai: MaterialTarget) -> str:
    """从 Moai 的 base_time 计算星座。"""

    if moai.base_time is None:
        return "未知"
    flat = moai.aqueduct.de_recursive(moai.base_time)
    month, day = flat[1], flat[2]
    for (sm, sd), (em, ed), name in _ZODIAC:
        if (month == sm and day >= sd) or (month == em and day <= ed):
            return name
    return "摩羯座"  # ponytail: unreachable, pacifies type checkers


# 注册表: 名称 → 计算函数
MATERIALS: dict[str, Callable[[MaterialTarget], str | None]] = {
    "constellation": constellation,
}


if __name__ == "__main__":
    from weft_backend.aqueduct import gregorian_aqueduct

    def _moai(bt):
        """Helper: make a minimal moai-like object for testing."""
        return type("M", (), {"base_time": bt, "aqueduct": gregorian_aqueduct})()

    # 边界测试
    assert constellation(_moai(Phase(base_time=[2000, 1, 1]))) == "摩羯座"
    assert constellation(_moai(Phase(base_time=[2000, 1, 20]))) == "水瓶座"
    assert constellation(_moai(Phase(base_time=[2000, 2, 18]))) == "水瓶座"
    assert constellation(_moai(Phase(base_time=[2000, 2, 19]))) == "双鱼座"
    assert constellation(_moai(Phase(base_time=[2000, 7, 23]))) == "狮子座"
    assert constellation(_moai(Phase(base_time=[2000, 12, 21]))) == "射手座"
    assert constellation(_moai(Phase(base_time=[2000, 12, 22]))) == "摩羯座"
    print("ok")
