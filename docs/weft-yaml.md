# YAML 规范

WEFT 支持 YAML（`.yaml`、`.yml`）、JSON 和 TOML。下面以 YAML 展示稳定的
故事文件结构；各格式最终都必须解析为同样的映射和列表。

## 最小示例

```yaml
story:
  title: 示例故事

moai:
  阿青:
    base_time: &birth [2000, 1, 1]
    description: 主角
  阿白:
    description: 阿青的朋友

moai_link:
  朋友:
    - moais: [阿青, 阿白]
      relations: 相识多年的朋友

drift:
  第一章:
    相遇:
      start_time: &meeting [2025, 4, 2, 10]
      end_time: [0, 0, 0, 2, *meeting]
      moais: [阿青, 阿白]
      description: 两人在车站相遇。

narrative:
  阿青视角:
    subject: [第一章]
    observer: 阿青
```

## 顶层字段

| 字段 | 是否必需 | 含义 |
|------|----------|------|
| `story` | 是 | 标题、描述和历法选择 |
| `aqueduct` | 否 | 自定义历法注册名到 Python 文件的映射 |
| `material` | 否 | 自定义派生属性注册名到 Python 文件的映射 |
| `moai` | 否 | 以名称为键的实体 |
| `moai_link` | 否 | 实体关系分组 |
| `drift` | 否 | 事件分组 |
| `narrative` | 否 | 叙事视角与事件选择 |

`story.title` 必须是字符串；`story.description` 可选。`story.date_mode`
默认为 `gregorian`，也可选择内置的 `gregorian_en` 或顶层
`aqueduct` 注册的历法。

WEFT 的字段设计刻意保持最小。Moai 和 Drift 是核心叙事原语，而不是一套固定的
世界观分类系统。不要为了让故事“符合 WEFT”而把作者的概念压缩成预设类型；
应当把故事自身需要的属性放在 Moai 上，并在需要计算时使用 material。

本页侧重文件写法；每个字段为什么存在、哪些约束是有意设计的，参见
[DAO 字段设计](dao.md)。

这里的“无边界”适用于世界建模。`narrative` 则为最终小说叙事服务，会刻意施加
固定视角约束：每个 Narrative 只有一个 `observer`，而且该 observer 必须参与
所有被选事件。需要切换视角时，应建立新的 Narrative，而不是让同一个 Narrative
隐式越过观察者的认知边界。

## 时间列表

公历时间位置依次为年、月、日、时、分、秒。列表可以省略末尾的零：

```yaml
start_time: [2025, 4, 2, 10]
```

末尾嵌套的列表表示参考时间，前面的整数是相对偏移：

```yaml
start_time: &arrival [2025, 4, 2, 10]
end_time: [0, 0, 0, 2, *arrival] # arrival 两小时后
```

自定义历法的列表长度由其 Brick 数量决定。详细规则见[时间引擎](phase.md)。

## Material

Moai 的未知字段会保存在 `extra_props` 中。`materials` 中列出的函数会在加载时
运行，计算结果也会写入 `extra_props`：

```yaml
moai:
  阿青:
    base_time: [2000, 3, 21]
    materials: [constellation]
```

`constellation` 是内置 material。自定义 material 在顶层注册，路径相对于故事
文件所在目录：

```yaml
material:
  rank: ./materials/rank.py
```

插件文件必须导出 `material(moai)`：

```python
def material(moai):
    return (moai.extra_props or {}).get("score", 0) // 10
```

注册名可以覆盖内置 material。插件以 WEFT 进程权限执行，只应加载可信代码；
每次加载故事时，注册表都会先恢复为内置状态。

例如，一个故事可以为人物定义 `阵营` 和 `灵力`，另一个故事可以为城市定义
`人口` 和 `气候`。这些都不需要 WEFT 增加新的内置模型字段：

```yaml
moai:
  北境城:
    description: 建在永冻河上的城邦
    类型: 城市
    人口: 42000
    气候: 极夜季多风
```

编辑后应使用 MCP 的 `validate_story` 校验；修改时间时还应调用
`resolve_timeline` 检查解析结果。
