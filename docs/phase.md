# 时间与 Rhai 历法

WEFT 的时间内核由 Rust 实现。故事中的时间使用最多六个整数表示：

```yaml
start_time: [2026, 7, 27, 12, 30, 0]
```

缺少的低位分量自动补零。列表末尾可以嵌套另一段时间，表示相对时间：

```yaml
start_time: [2, 3, [2020, 1, 1]]
```

Rust `Phase` 沿引用链累加各层分量，得到绝对时间。内置 `gregorian` 和
`gregorian_en` 支持格里高利历归一化、显示与 tick 转换。

## Rhai 历法插件

顶层 `aqueduct` 将注册名映射到相对于故事文件的 `.rhai` 文件：

```yaml
aqueduct:
  gethen:
    runtime: rhai
    kind: calendar
    api: 1
    source: ./calendars/gethen.rhai
story:
  title: 黑暗的左手
  date_mode: gethen
```

历法脚本 API v1 包含四个入口：

```rhai
fn metadata() {
    #{
        title: "幻想历法",
        description: "十二个月、每月三十日",
        units: ["年", "月", "日", "时"]
    }
}

fn normalize(values) { values }

fn to_tick(values) {
    (((values[0] * 12 + values[1] - 1) * 30 + values[2] - 1) * 24) + values[3]
}

fn humanize(values) {
    `${values[0]}年${values[1]}月${values[2]}日`
}
```

四个入口都接收固定六分量数组；metadata 中的 `units` 决定展示的有效层级。
`to_tick` 必须返回单调递增的最小单位坐标，供 Drift 排序和区间检查使用。
`normalize` 用于相对时间差的进位与借位。

Rhai 脚本会编译并缓存。运行时限制表达式深度、调用深度、运算次数、变量数量
以及字符串、数组和 Map 大小，默认不开放文件系统和网络。完整示例见
`examples/calendars/gethen.rhai`。
