# Drift 事件

Drift 是时间线中的事件。事件按组组织，事件 ID 由
`分组名/事件标题` 自动组成：

```yaml
drift:
  第一章:
    相遇:
      start_time: &meeting [2025, 4, 2, 10]
      end_time: [0, 0, 0, 2, *meeting]
      moais: [阿青, 阿白]
      description: 两人在车站相遇。
```

| 字段 | 是否必需 | 含义 |
|------|----------|------|
| `start_time` | 是 | 事件开始时间 |
| `end_time` | 否 | 事件结束时间，不得早于开始时间 |
| `moais` | 否 | 参与事件的已有实体名称 |
| `description` | 否 | 事件描述 |

事件标题目前最长 20 个字符。每个 `moais` 引用都必须存在，否则故事加载失败。

## Narrative

Narrative 不是普通的事件标签或筛选器，而是为最后写成小说准备的叙事大纲。它从
世界中已经发生的 Drift 里选择素材，并为这一段叙事指定固定观察者：

```yaml
narrative:
  阿青视角:
    subject: [第一章, 第二章/重逢]
    observer: 阿青
```

分组名会按 YAML 中的事件顺序展开；精确 ID 只选择一个事件。WEFT 当前不会把
Narrative 自动按时间重新排序。

`observer` 必须是已有 Moai，并且必须出现在每个所选事件的 `moais` 中。这项
校验是有意设计的严格约束：固定视角是小说写作的基本原则，Narrative 不应在未
声明的情况下进入观察者不在场的事件。

如果小说需要切换视角，应创建另一个 Narrative 并选择新的 observer，使每一段
叙事的视角边界保持明确。例如：

```yaml
narrative:
  阿青视角:
    subject: [第一章]
    observer: 阿青
  阿白视角:
    subject: [第二章]
    observer: 阿白
```

桌面端的 Narrative 页面按解析后的顺序展示这些事件。需要确认绝对时间时，使用
MCP 的 `resolve_timeline`。
