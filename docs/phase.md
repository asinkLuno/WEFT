# 时间与 Rhai 历法

WEFT 的时间内核由 Rust 实现。故事中的时间使用最多六个整数表示：

```yaml
start_time: [2026, 7, 27, 12, 30, 0]
```

缺少的低位分量自动补零。列表末尾可以嵌套另一段时间，表示相对时间：

```yaml
start_time: [2, 3, [2020, 1, 1]]
```

Rust `Phase` 沿引用链累加各层分量，得到绝对时间。

## 内置历法

内置历法共用 `gregorian_core.rhai` 中的格里高利历算法（闰年判断、归一化、tick
转换、星期计算），各自附带独立本地化脚本：

| date_mode | 本地化 | 示例 |
|-----------|--------|------|
| `gregorian` | 中文 | 2026年7月27日 |
| `gregorian_en` | 英文 | Jul 27, 2026 |
| `gregorian_ja` | 日文 | 2026年7月27日 |

三者均使用六分量（`components: 6`）`[年, 月, 日, 时, 分, 秒]`。

`gregorian` 是默认历法；未指定 `story.date_mode` 时使用。

### extra() — 派生信息

内置历法额外提供 `extra(values)` 函数（通过 Rust `Calendar::extra()` 调用），
返回当前日期在历法上下文中的派生信息，包括星期和节日：

```json
{
  "weekday": "日",
  "weekday_number": 7,
  "holiday": "母亲节"
}
```

- `weekday`: 本地化星期名称
- `weekday_number`: 1–7，1=星期一 … 7=星期日（Sakamoto 算法）
- `holiday`: 仅当日期匹配某个计算型节日时出现

各历法支持的节日：

| 历法 | 节日 |
|------|------|
| `gregorian` | 母亲节（5月第2日曜）、父亲节（6月第3日曜） |
| `gregorian_en` | Mother's Day（5月第2周日）、Father's Day（6月第3周日）、Thanksgiving（11月第4周四） |
| `gregorian_ja` | 母の日（5月第2日曜）、父の日（6月第3日曜） |

## 自定义 Rhai 历法

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

### API v1

Rhai 历法脚本 API v1 包含四个必需入口和一个可选入口：

```rhai
fn metadata() {
    #{
        title: "幻想历法",
        description: "十二个月、每月三十日",
        components: 4
    }
}

fn normalize(values) { values }

fn to_tick(values) {
    (((values[0] * 12 + values[1] - 1) * 30 + values[2] - 1) * 24) + values[3]
}

fn humanize(values) {
    `${values[0]}年${values[1]}月${values[2]}日`
}

// 可选
fn extra(values) {
    #{ /* 任意派生信息 */ }
}
```

| 函数 | 参数 | 返回值 | 必需 |
|------|------|--------|------|
| `metadata()` | 无 | Map（包含 title, description, components） | 是 |
| `normalize(values)` | `[i64;n]` | `[i64;n]`（n 为该历法的 `components`） | 是 |
| `to_tick(values)` | `[i64;n]` | `i64`（单调递增的最小单位坐标） | 是 |
| `humanize(values)` | `[i64;n]` | String | 是 |
| `extra(values)` | `[i64;n]` | Map（任意派生信息） | 否，可选 |

`extra()` 的返回值会通过 `CalendarMetadata.extra_props` 以 JSON 形式暴露给
前端和 MCP 调用方。

### 核心 + 本地化架构

内置历法使用 Rhai 脚本拼接实现共享逻辑：
`gregorian_core.rhai`（核心算法）与各语言本地化脚本通过 Rust 编译期拼接后
注入同一 Rhai 引擎。自定义历法可参考此模式，将通用逻辑放在一个文件中，
再通过 `load_script` 或源码层面的拼接复用。

### 运行时限制

Rhai 脚本会编译并缓存。运行时限制：

- 表达式深度：64
- 调用深度：32
- 运算次数：100,000
- 变量数量：256
- 数组大小：10,000
- Map 大小：1,000
- 字符串大小：1,000,000 字符

不开放文件系统和网络。完整示例见 `examples/calendars/gethen.rhai`。
