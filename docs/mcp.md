# AI 与 MCP

WEFT 可执行文件内置 stdio MCP server，与桌面应用共享同一套 Rust 领域模型。

## 启动

```bash
weft mcp
```

开发环境可以使用：

```bash
cargo run --manifest-path src-tauri/Cargo.toml -- mcp
```

客户端通过 stdin/stdout 发送 JSON-RPC。server 支持 MCP initialize、ping、
tools/list 与 tools/call。

## Tools

| Tool | 说明 |
|------|------|
| `load_story(path)` | 加载并验证 YAML/YML 故事，返回标题及实体、事件数量 |
| `get_story()` | 返回当前 Story metadata |
| `list_moai()` | 返回全部 Moai、material 结果与 journal |
| `get_timeline()` | 返回按组排序并带 tick 的 Drift |
| `get_narratives()` | 返回解析后的叙事大纲 |

除 `load_story` 外的工具要求当前 MCP 会话已加载故事。Rhai 历法和 Material
会在加载过程中使用与桌面应用相同的资源限制执行。

## Codex 配置示例

```toml
[mcp_servers.weft]
command = "/absolute/path/to/weft"
args = ["mcp"]
```

MCP server 不启动 HTTP 端口，也不需要 Python 运行时。
