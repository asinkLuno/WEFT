# Moai 实体

Moai 是故事中被事件关联的实体，可以是人物、地点、组织、物件或抽象概念。
`moai` 是以唯一名称为键的映射：

```yaml
moai:
  阿青:
    description: 主角
    base_time: [2000, 1, 1]
    materials: [constellation]
    occupation: 编辑
```

| 字段 | 含义 |
|------|------|
| `description` | 可选描述，默认为空字符串 |
| `base_time` | 可选时间锚点 |
| `materials` | 可选的派生属性函数列表 |
| 其他字段 | 原样保存在 `extra_props` |

如果 Moai 有 `base_time`，WEFT 会为该实体参与的每个 Drift 建立 journal，
记录事件开始、结束时间相对于该锚点的偏移。没有时间锚点的实体仍然可以参与事件
和关系，但不会生成这些偏移。

## 关系

`moai_link` 按用途分组。每条关系必须引用两个已经存在的 Moai：

```yaml
moai_link:
  人物关系:
    - moais: [阿青, 阿白]
      relations: 朋友
      bidirectional: true
```

`relations` 是关系描述；`bidirectional` 默认为 `true`。当前桌面端会把这些关系
转换成节点和边进行展示。

## 派生属性

内置 `constellation` 会依据 `base_time` 的月和日计算星座。你也可以通过
自定义 material 读取 Moai 的 `base_time`、`extra_props` 等属性并返回任意
可序列化结果，具体注册方式见 [YAML 规范](weft-yaml.md#material)。
