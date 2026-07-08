"""Moai material functions — 从 Moai 属性计算出派生属性。"""

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


def constellation(flat_time: list[int]) -> str:
    """从 gregorian [Y, M, D, H, m, s] 计算星座。"""
    month, day = flat_time[1], flat_time[2]
    for (sm, sd), (em, ed), name in _ZODIAC:
        if (month == sm and day >= sd) or (month == em and day <= ed):
            return name
    return "摩羯座"  # ponytail: unreachable, pacifies type checkers


# 注册表: 名称 → 计算函数
MATERIALS: dict[str, callable] = {
    "constellation": constellation,
}


if __name__ == "__main__":
    # 边界测试
    assert constellation([2000, 1, 1, 0, 0, 0]) == "摩羯座"  # Jan 1
    assert constellation([2000, 1, 20, 0, 0, 0]) == "水瓶座"  # Jan 20
    assert constellation([2000, 2, 18, 0, 0, 0]) == "水瓶座"  # Feb 18
    assert constellation([2000, 2, 19, 0, 0, 0]) == "双鱼座"  # Feb 19
    assert constellation([2000, 7, 23, 0, 0, 0]) == "狮子座"  # Jul 23
    assert constellation([2000, 12, 21, 0, 0, 0]) == "射手座"  # Dec 21
    assert constellation([2000, 12, 22, 0, 0, 0]) == "摩羯座"  # Dec 22
    print("ok")
