"""时间合理性检查 — 解析时间表 / 加载 YAML 世界，输出解析后的时间与年龄，标记可疑项。

完全复用 ``weft_backend`` 的相位计算 (``Aqueduct`` 的 de_recursive/normalize/
humanize/minus，经 ``dao.load_dao``)，不重新实现，所以与线上后端结论一致。

用法::

    python -m weft_backend.check tests/guojing.yml            # 检查整个文件
    python -m weft_backend.check '[-18,0,0,0,0,0,[2020,1,1,0,0,0]]'  # 解析单个时间表
"""

from __future__ import annotations

import json
import sys

from weft_backend.aqueduct import gregorian_aqueduct
from weft_backend.dao import AQUEDUCTS, Dao, _phase, load_dao


def resolve_time_list(data: list) -> str:
    """把一个自包含的时间表 (绝对，或带内嵌 ref 的相对) 解析成可读日期。

    相对时间表的 ref 必须内嵌在列表里；跨文件的 YAML 锚点 (``*name``) 只能通过
    整个文件检查 (见 :func:`check`) 解析。
    """
    flat = gregorian_aqueduct.de_recursive(_phase(data, gregorian_aqueduct))
    return gregorian_aqueduct.humanize(gregorian_aqueduct.normalize(flat))


def check(dao: Dao) -> tuple[list[str], list[str]]:
    """检查已加载的世界 ``dao``，返回 ``(报告行, 警告行)``。

    报告里每个 moai 的出生时间、每个 drift 的时间与涉及角色的时年都已被相位计算
    解析。警告捕获不可能的时序：事件早于角色出生、结束早于开始。

    文件 IO 留给调用方 (CLI 的 :func:`main` / API 端点)，这里只看数据。
    """
    aqueduct = AQUEDUCTS[dao.story.date_mode]
    report: list[str] = []
    warnings: list[str] = []

    # ── 角色出生时间 ──
    report.append("# 角色时间")
    norm_base: dict[
        str, list[int]
    ] = {}  # ponytail: 缓存 normalize 后的出生时间，供时序比较
    for key, m in (dao.moai or {}).items():
        if m.base_time is None:
            report.append(f"  {m.name}: (无 base_time)")
            continue
        norm_base[key] = aqueduct.normalize(aqueduct.de_recursive(m.base_time))
        report.append(f"  {m.name}: {m.base_time_display}")

    # ── 漂移事件 ──
    for season, events in (dao.drift or {}).items():
        report.append(f"# 漂移 [{season}]")
        for d in events:
            ns = aqueduct.normalize(d.flat_start)
            report.append(f"  · {d.title}")
            report.append(f"      时间: {aqueduct.humanize(ns)}")
            if d.flat_end is not None:
                ne = aqueduct.normalize(d.flat_end)
                report.append(f"      结束: {aqueduct.humanize(ne)}")
                if ne < ns:
                    warnings.append(f"[{season}] «{d.title}» 结束早于开始")
            for name in d.moais or []:
                m = dao.moai[name]
                entry = m.journal.get(d.title)
                if entry is None:
                    continue
                start_phase, _ = entry
                report.append(
                    f"      {name} 时年: "
                    f"{aqueduct.humanize(aqueduct.normalize(start_phase.base_time))}"
                )
                if ns < norm_base[name]:
                    warnings.append(f"[{season}] «{d.title}» 早于 {name} 的出生时间")

    return report, warnings


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print(__doc__)
        return 2

    arg = argv[1]
    if arg.lstrip().startswith("["):
        # 单个时间表 (JSON)
        try:
            data = json.loads(arg)
        except json.JSONDecodeError as e:
            print(f"无法解析时间表: {e}", file=sys.stderr)
            return 1
        print(resolve_time_list(data))
        return 0

    # 整个文件
    report, warnings = check(load_dao(arg))
    print("\n".join(report))
    if warnings:
        print("\n# ⚠ 可疑")
        for w in warnings:
            print(f"  ⚠ {w}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
