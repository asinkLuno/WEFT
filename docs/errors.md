# 错误体系

WEFT 在文件读取、语法解析、领域校验和时间计算之间使用统一的结构化错误。目标是
让作者看到可读提示，也让 AI Agent 能根据稳定字段定位并修复故事，而不是解析
不稳定的 Python traceback。

## 错误结构

MCP 的 `validate_story` 在失败时同时保留兼容文本和结构化列表：

```json
{
  "valid": false,
  "path": "story.yml",
  "error": "story.yml:7:14: drift.chapter.arrival.moais: drift 引用了不存在的 moai: 'nobody' [DRIFT_MOAI_NOT_FOUND]",
  "error_type": "ReferenceError",
  "errors": [
    {
      "code": "DRIFT_MOAI_NOT_FOUND",
      "stage": "reference",
      "message": "drift 引用了不存在的 moai: 'nobody'",
      "source": "story.yml",
      "path": ["drift", "chapter", "arrival", "moais"],
      "path_display": "drift.chapter.arrival.moais",
      "line": 7,
      "column": 14,
      "details": {"moai": "nobody"}
    }
  ]
}
```

| 字段 | 含义 |
|------|------|
| `code` | 稳定、适合程序判断的错误码 |
| `stage` | 错误发生的处理阶段 |
| `message` | 面向作者的简洁说明 |
| `source` | 故事文件路径 |
| `path` | 从故事根节点到错误字段的结构化路径 |
| `path_display` | 适合日志和界面展示的路径 |
| `line` / `column` | 从 1 开始的源文件位置；能够确定时提供 |
| `hint` | 可选修复建议 |
| `details` | 与错误码对应的机器可读上下文 |

`error` 和 `error_type` 是为旧客户端保留的字段。新客户端应优先读取 `errors`。

## 处理阶段

| Stage | 含义 | 示例 |
|-------|------|------|
| `file` | 文件访问失败 | 文件不存在、没有读取权限 |
| `parse` | 文本无法解析 | YAML、JSON 或 TOML 语法错误 |
| `schema` | 数据形状或字段类型错误 | 缺少 `start_time`、标题过长 |
| `reference` | 对象引用无法解析 | Drift 引用了不存在的 Moai |
| `timeline` | 时间关系不成立 | `end_time` 早于 `start_time` |
| `plugin` | Aqueduct 或 material 插件失败 | 文件不存在、入口缺失、执行异常 |
| `state` | 应用状态不允许当前操作 | 尚未加载故事 |
| `internal` | 未预期的实现错误 | 不应由普通故事内容触发 |

## 错误码约定

错误码使用大写蛇形命名，并按对象和原因组合，例如：

- `YAML_SYNTAX`
- `ROOT_NOT_MAPPING`
- `DRIFT_START_REQUIRED`
- `DRIFT_MOAI_NOT_FOUND`
- `DRIFT_END_BEFORE_START`
- `NARRATIVE_OBSERVER_ABSENT`
- `AQUEDUCT_FILE_NOT_FOUND`
- `MATERIAL_LOAD_FAILED`

客户端应根据 `code` 决定行为，根据 `message` 向用户展示信息。不要依赖异常类名或
完整英文/中文句子。

## YAML 位置

YAML 语法错误直接使用解析器给出的行列。领域错误在失败后根据结构化 `path`
回查 YAML 节点位置，因此不会拖慢成功加载；如果错误字段缺失，则位置指向最近的
已有父节点。

JSON 语法错误同样提供行列。JSON/TOML 的领域错误始终提供字段路径，但某些情况
可能没有行列。

## 桌面应用与热重载

桌面应用打开无效文件时，会把统一错误文本返回给前端。热重载解析失败时：

1. 保留上一次成功加载的 Dao；
2. 将结构化错误写入日志的 `weft_error` 字段；
3. 通过 `weft-error` 事件把同一份结构化错误发送给前端；
4. 在窗口顶部显示错误码、消息、字段路径、行列和可选 hint；
5. 等待下一次文件修改重新加载。

这样一次未写完的 YAML 保存不会破坏作者当前正在查看的故事。
用户可以关闭错误横幅；下一次成功加载会刷新页面并清除错误状态。应用启动参数指向
无效故事时，空状态页也会通过 `get_load_error` 显示最近一次加载失败的原因。

## Agent 修复流程

Agent 调用 `validate_story` 后应：

1. 检查 `valid`；
2. 按 `errors[].path` 找到字段；
3. 使用 `code` 和 `details` 判断修复方式；
4. 修改后再次调用 `validate_story`；
5. 时间字段改变时再调用 `resolve_timeline`。
