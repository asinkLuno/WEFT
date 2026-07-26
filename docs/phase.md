# 时间引擎

Weft 的时间系统由两层组成：**Phase**（相位）负责表达时间点，**Aqueduct**（引水渠）负责进位与格式化。

命名的隐喻来自项目核心概念。子在川上曰：“逝者如斯夫，不舍昼夜。”
**Drift** 是随时间之水流逝的事件；**Moai** 是水流中稳定的石头；
**Aqueduct** 是引水渠，规定时间之水有哪些单位、怎样进位、如何显示以及向
时间轴的什么位置流动。水流入渠，渠规范水，因此它很适合作为历法引擎的名字。

两者都不绑定特定历法——格里高利历只是内置的参考实现，你可以定义自己的历法系统。

---

## Phase：递归时间点

时间是相对的。与其在所有地方写死绝对时间，不如让每个时间点引用另一个时间点，形成链条。这就是 Phase 的设计。

```python
class Phase(BaseModel):
    base_time: list[int]         # 偏移量，如 [-18, 0, 0, 0, 0, 0]
    ref_time: list[int] | Phase | None = None  # 参考点
```

### 解析过程：`de_recursive`

从叶子 Phase 开始，逐层累加偏移量，最终得到一个"拉平"的绝对时间：

```python
def de_recursive(self, phase: Phase) -> list[int]:
    result = phase.base_time
    ref = phase.ref_time
    while ref is not None:
        if isinstance(ref, Phase):
            result = self.plus(result, ref.base_time)
            ref = ref.ref_time
        else:
            result = self.plus(result, ref)
            ref = None
    return result
```

在 YAML 中，这个过程是隐式的——你写的嵌套列表被后端解析为 Phase 链：

```yaml
# "纪元庆典的 18 年前"
base_time: [-18, 0, 0, 0, 0, 0, [2020, 1, 1, 0, 0, 0]]

# 等价于：
# Phase(base_time=[-18,0,0,0,0,0], ref_time=Phase(base_time=[2020,1,1,0,0,0]))
# → de_recursive → [-18+2020, 0+1, 0+1, ...] → [2002, 1, 1, 0, 0, 0]
```

结合 YAML 锚点，可以构建更深的链：

```yaml
base_time: &epoch_festival [2020, 1, 1, 0, 0, 0]
base_time: [-18, 0, 0, 0, 0, 0, *epoch_festival] # 2002-01-01
base_time: [20, 0, 0, 0, 0, 0, *epoch_festival]  # 2040-01-01
```

`de_recursive` 之后得到的是一个**未进位**的原始列表——月可能是 0，日可能是 40。下一步交给 Aqueduct。

---

## Aqueduct：历法引擎

`Aqueduct` 是一组有序的 **Brick**（时间砖块），每个 Brick 代表一个时间单位，并定义了**进位规则**。

### Brick

```python
class Brick:
    def __init__(self, name: str, get_limit: Callable[[dict[str, int]], int]):
        self.name = name
        self.get_limit = get_limit  # 返回进位上限，或 maxsize 表示无上限
```

`get_limit` 接收**当前所有砖块的值**（字典，键为砖块名），返回该单位的进位上限。这允许日数依赖年月（如二月的 28/29 天），月数依赖年（如闰月）。

| 返回值 | 含义 |
|--------|------|
| 正整数 | 逢此数进位（如 24 → 时，60 → 分） |
| `maxsize` | 无上限，不自动进位（如年份） |

### normalize

`normalize` 从最小单位（秒）向最大单位（年）逐级进位：

```python
def normalize(self, values: list[int]) -> list[int]:
    c = 0  # 进位
    res = []
    for brick in reversed(self.bricks):
        v = brick_values[brick.name] + c
        limit = brick.get_limit(brick_values)
        if limit != maxsize:
            c = v // limit
            v = v % limit
        else:
            c = 0
        res.append(v)
    return res[::-1]  # 反转回 [年, 月, 日, 时, 分, 秒]
```

例如 `[2024, 13, 0, 0, 0, 0]` → 月进位 12 → `[2025, 1, 0, 0, 0, 0]`。

负数也会处理：`[2024, -1, 0, 0, 0, 0]` → `[2023, 11, 0, 0, 0, 0]`。

### humanize / plus / minus

这些是 `normalize` 之上的便捷方法：

- **`humanize(values)`** → `"2024年1月15日12时30分"`（省略值为零的单位）
- **`plus(a, b)`** → 逐分量相加（不自动进位，由 normalize 另行处理）
- **`minus(a, b)`** → 逐分量相减

---

## 内置历法：格里高利历

WEFT 内置两个共用相同公历计算规则的类型：

- `gregorian`：中文时间单位，例如 `2024年1月15日`
- `gregorian_en`：英文时间单位，例如
  `2024 years, 1 month, 15 days`

在故事中通过 `story.date_mode` 选择：

```yaml
story:
  title: An English Story
  date_mode: gregorian_en
```

### 历法 metadata

桌面端会在 Story 页面展示当前历法的名称、简介、时间单位和来源。历法可以通过
可选的 `metadata` 参数提供显示名称和简介：

```python
from weft_backend.aqueduct import Aqueduct, AqueductMetadata, Brick

aqueduct = Aqueduct(
    [Brick("年", ...), Brick("月", ...), Brick("日", ...)],
    metadata=AqueductMetadata(
        title="幻想历",
        description="王国采用的官方历法。",
    ),
)
```

时间单位直接从 `bricks` 推导。未提供 metadata 的旧插件仍可正常加载，界面会
以注册名作为标题，并继续展示其时间单位。

```python
gregorian_aqueduct = Aqueduct([
    Brick("年", get_limit=lambda ctx: maxsize),     # 无上限
    Brick("月", get_limit=lambda ctx: 12),           # 12 月 = 1 年
    Brick("日", get_limit=get_days_in_month),         # 28–31 日 = 1 月
    Brick("时", get_limit=lambda ctx: 24),           # 24 时 = 1 日
    Brick("分", get_limit=lambda ctx: 60),           # 60 分 = 1 时
    Brick("秒", get_limit=lambda ctx: 60),           # 60 秒 = 1 分
])
```

其中 `get_days_in_month` 根据当前年月计算该月天数，包含闰年逻辑。这是 Aqueduct 灵活性的关键——`get_limit` 可以看到**所有砖块的当前值**，做出上下文相关的进位决策。

---

## 自定义历法

定义一个历法就是定义一组 Brick，并在插件模块中导出名为
`aqueduct` 的 `Aqueduct` 实例。以下是一个极端简化的例子：

### 示例：10 天一旬、3 旬一月、4 月一年的幻想历

```python
from weft_backend.aqueduct import Aqueduct, Brick
from sys import maxsize

aqueduct = Aqueduct([
    Brick("年", get_limit=lambda ctx: maxsize),   # 年不设上限
    Brick("月", get_limit=lambda ctx: 4),          # 4 月 = 1 年
    Brick("旬", get_limit=lambda ctx: 3),          # 3 旬 = 1 月
    Brick("日", get_limit=lambda ctx: 10),         # 10 日 = 1 旬
])
```

在故事文件中注册插件。相对路径以故事文件所在目录为基准：

```yaml
aqueduct:
  fantasy: ./calendars/fantasy.py

story:
  title: 幻想故事
  date_mode: fantasy
```

注册名可以覆盖内置历法。每次加载故事前，注册表都会恢复为内置基线，
因此上一个故事加载的插件不会泄漏到下一个故事。

在 Python 中直接使用时，方式与格里高利历完全相同：

```python
# 规范化
aqueduct.normalize([1, 5, 2, 15])
# → [2, 2, 0, 5]
# 5月进位为1年1月；15日进位为1旬5日；合计3旬再进位为1月

# 人类可读
aqueduct.humanize([3, 2, 1, 5])
# → "3年2月1旬5日"

# 时间运算
a = [3, 1, 0, 5]
b = [0, 0, 2, 5]
aqueduct.normalize(aqueduct.plus(a, b))
# → [3, 2, 0, 0]
```

### 示例：修改格里高利历（固定 30 天/月）

```python
simple_gregorian = Aqueduct([
    Brick("年", get_limit=lambda ctx: maxsize),
    Brick("月", get_limit=lambda ctx: 12),
    Brick("日", get_limit=lambda ctx: 30),  # 每月固定 30 天
    Brick("时", get_limit=lambda ctx: 24),
    Brick("分", get_limit=lambda ctx: 60),
    Brick("秒", get_limit=lambda ctx: 60),
])
```

### Brick 命名规则

Brick 的名字**不需要**用中文。你可以用任何名字：

```python
Brick("year", get_limit=lambda ctx: maxsize),
Brick("month", get_limit=lambda ctx: 12),
Brick("day", get_limit=lambda ctx: 30),
```

名字默认影响 `humanize()` 的输出格式（`f"{v}{name}"`）。如果需要
单复数、分隔符或其他展示规则，可以在构造 `Aqueduct` 时传入
`humanizer(values, bricks)`。

用于完整时间轴展示的历法还应通过 `to_tick` 参数提供绝对时间到最小单位坐标
的转换；甘特图定位和时间距离依赖这个坐标。

### `get_limit` 的威力

`get_limit(ctx)` 的 `ctx` 参数包含**当前所有砖块的原始值**（进位前的），以砖块名为键。这允许：

- **闰月**：检查 `ctx["年"]` 是否为特定年份
- **大小月**：检查 `ctx["月"]` 的值
- **闰年二月**：同时检查年和月

格里高利历的 `get_days_in_month` 就是最好的例子——它根据 `ctx["年"]` 和 `ctx["月"]` 决定返回 28、29、30 还是 31。

---

## 当前限制

| 限制 | 说明 |
|------|------|
| 插件代码可信度 | 历法是 Python 代码，会以 WEFT 进程权限执行，只应加载可信文件 |
| `to_tick` 实际要求 | `Aqueduct` 构造参数允许省略它，但当前 Drift 加载会计算 tick；故事包含 Drift 时，自定义历法必须提供 `to_tick` |

时间列表会按照所选历法的 Brick 数量自动补零和校验，因此自定义历法不要求
固定为六个分量。

仓库中的 `examples/calendars/gethen.py` 是一个完整示例：它定义了四个 Brick、
自定义英文格式化和 `to_tick`，并由 `examples/黑暗的左手.yml` 注册使用。
