# 桌面应用通信

桌面应用由 Tauri/Rust、React 前端和 Python 领域层组成。前端通过 Tauri IPC
调用 Python command handlers，不启动 HTTP API。

## IPC commands

| Command | 返回内容 |
|---------|----------|
| `get_story` | 当前故事的标题、描述和 `date_mode` |
| `get_moai` | 当前故事的 Moai 映射 |
| `get_drift` | 当前故事的 Drift 分组 |
| `get_narrative` | 当前故事的 Narrative 映射 |
| `get_moai_link` | 供前端绘图使用的关系节点与边 |
| `get_load_error` | 最近一次故事加载失败的结构化错误；没有错误时为 `null` |
| `open_story` | 打开原生文件选择器并加载所选 YAML |

这些 commands 供桌面前端使用。Code Agent 应使用独立的
[stdio MCP tools](mcp.md)，而不是直接调用 IPC。

## 启动与打开文件

开发模式可在命令行传入初始故事：

```bash
cargo tauri dev -- examples/红楼梦.yml
```

不传文件时桌面端仍会打开，并显示选择故事文件的空状态页面。当前原生文件选择器
接受 `.yaml` 和 `.yml`；Python 加载层及 MCP 还支持 `.json` 和 `.toml`。

## 文件热重载

加载故事后，后端会监视该文件所在目录。当前文件发生变化且重新解析成功时：

1. 后端原子地替换当前故事状态；
2. 发出 `weft-reload` 事件；
3. 前端重新请求当前页面的数据。

如果新内容无法解析，后端会记录错误并保留上一次成功加载的状态。通过文件选择器
打开另一个故事后，监视器会切换到新文件。

解析失败时，后端还会发出 `weft-error` 事件。前端使用它显示包含错误码、字段
路径和 YAML 行列的横幅；成功重载后，正常的 `weft-reload` 会刷新页面并清除
提示。完整载荷见[错误体系](errors.md)。
