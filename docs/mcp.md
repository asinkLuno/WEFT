# AI 与 MCP

WEFT 把真实的 Python 领域模型作为本地 MCP tools 提供给 Code Agent。AI
可以读取 schema、校验故事、解析时间线，而不必启动桌面窗口，也不需要访问
HTTP 服务。

## 为什么同时提供 Skill 和 MCP

WEFT 的目标不是让用户先学会 YAML，再让 AI 帮忙检查语法。理想用法是用户只描述
创作意图，例如：

```text
在“冰原穿越”里增加一个发现废弃营地的事件，发生在离开普勒芬第十二天。
金利和埃斯特拉文都在场，并把它加入金利的冰原记录。
```

Agent 应完成整个结构化编辑过程：查找已有时间锚点和实体、添加 Drift、维护
Narrative，然后校验引用和解析后的绝对时间。

Skill 和 MCP 分工如下：

| 能力 | 作用 |
|------|------|
| `weft-yaml` skill | 教 Agent 理解 WEFT 概念、文件格式以及如何安全地编辑故事 |
| WEFT MCP | 用当前安装版本的真实代码提供 schema、校验、检查和时间线解析 |
| 桌面应用 | 让作者直观检查最终时间轴、实体关系和叙事视角 |

Skill 提供编辑知识，MCP 提供事实和执行反馈。两者配合后，YAML 成为 Agent 维护、
适合 Git 追踪的底层格式，而不是作者必须亲手操作的界面。

```text
Claude Code / Codex / Copilot / Cursor
                  │
                  │ stdio
                  ▼
             weft mcp
                  │
                  ▼
       load_dao + Pydantic + Aqueduct
```

MCP server 与桌面应用位于同一个 standalone 可执行文件中：

```bash
weft       # 启动 Tauri GUI
weft mcp   # 启动无界面的 stdio MCP server
```

MCP 客户端负责启动和关闭 `weft mcp`。不要提前手动运行它，也不要把它配置成
HTTP URL。

## 准备可执行文件

### 已安装的应用

使用 WEFT 实际安装位置的绝对路径。常见位置如下：

```text
Linux    /usr/bin/weft
macOS    /Applications/WEFT.app/Contents/MacOS/weft
Windows  C:\Program Files\WEFT\weft.exe
```

实际位置取决于安装方式。配置前可以直接确认：

```bash
/absolute/path/to/weft mcp
```

这是 stdio server，启动后没有普通终端输出并等待 MCP 消息属于正常现象。

### 仓库开发版本

从仓库根目录构建：

```bash
cargo build \
  --manifest-path src-tauri/Cargo.toml \
  --features pytauri/standalone \
  --bin weft
```

Linux/macOS 开发路径为：

```text
<repo>/src-tauri/target/debug/weft
```

Windows 对应 `src-tauri\target\debug\weft.exe`。开发版本会使用仓库根目录的
`.venv`，应先执行 `uv sync`。

## Claude Code

只为当前仓库添加，并将配置写入项目：

```bash
claude mcp add \
  --scope project \
  --transport stdio \
  weft \
  -- /absolute/path/to/weft mcp
```

为当前用户的所有项目添加：

```bash
claude mcp add \
  --scope user \
  --transport stdio \
  weft \
  -- /absolute/path/to/weft mcp
```

检查连接：

```bash
claude mcp get weft
claude mcp list
```

也可以在 Claude Code 会话中执行 `/mcp` 查看状态和 tools。

项目配置可以直接写成根目录 `.mcp.json`：

```json
{
  "mcpServers": {
    "weft": {
      "type": "stdio",
      "command": "/absolute/path/to/weft",
      "args": ["mcp"],
      "env": {}
    }
  }
}
```

项目配置首次加载时需要用户确认信任。提交 `.mcp.json` 前应考虑团队成员的安装
路径是否一致；不一致时更适合让每个人使用 `--scope user` 添加。

## OpenAI Codex

通过 CLI 添加：

```bash
codex mcp add weft -- /absolute/path/to/weft mcp
```

检查或删除：

```bash
codex mcp get weft
codex mcp list
codex mcp remove weft
```

也可以写入项目的 `.codex/config.toml`：

```toml
[mcp_servers.weft]
command = "/absolute/path/to/weft"
args = ["mcp"]
```

重新打开 Codex 会话后生效。

## GitHub Copilot CLI

```bash
copilot mcp add weft -- /absolute/path/to/weft mcp
copilot mcp list
```

用户级配置文件是 `~/.copilot/mcp-config.json`：

```json
{
  "mcpServers": {
    "weft": {
      "type": "stdio",
      "command": "/absolute/path/to/weft",
      "args": ["mcp"],
      "tools": ["*"]
    }
  }
}
```

## Cursor 与其他客户端

支持本地 stdio MCP 的客户端通常接受以下结构：

```json
{
  "mcpServers": {
    "weft": {
      "command": "/absolute/path/to/weft",
      "args": ["mcp"]
    }
  }
}
```

例如 Cursor 的项目配置通常放在 `.cursor/mcp.json`。不同客户端可能把顶层键
命名为 `servers`，应以该客户端当前文档为准；`command` 和 `args` 的含义不变。

## Tools

| Tool | 用途 |
|------|------|
| `validate_story(path)` | 完整加载并校验 YAML、JSON 或 TOML；失败时返回结构化错误 |
| `inspect_story(path)` | 返回标题、实体数、事件分组数、事件数和 narrative 数 |
| `get_story_schema()` | 返回当前 Python/Pydantic 模型 schema |
| `resolve_timeline(path)` | 返回事件绝对时间及每个实体的 journal 偏移 |
| `list_moai(path)` | 返回实体、锚点、material 和派生属性 |
| `get_narrative(path, name)` | 返回指定 narrative 的观察者与解析后事件顺序 |

所有接受 `path` 的 tools 都读取本机文件。让 Agent 使用绝对路径最可靠；在仓库
会话中也可以使用相对于项目根目录的路径，例如 `examples/红楼梦.yml`。

## 推荐的 Agent 工作流

用户可以直接描述内容修改，不需要指定 YAML 字段。若需要为 Agent 设置固定工作
约束，可以这样写：

```text
按照我的自然语言要求维护 WEFT 故事。先读取现有故事并在需要时调用
get_story_schema，不要要求我手写 YAML。
编辑后必须调用 validate_story。
如果修改了 base_time、start_time 或 end_time，再调用 resolve_timeline，
确认所有绝对时间和实体偏移符合预期。
```

`weft-yaml` 插件负责告诉 Code Agent 如何编写高质量 WEFT 文件；MCP
负责用真实代码验证结果。用户只需审核故事内容和时间关系，无需关心字段排列、
引用格式或时间列表的具体写法。

## 安装 WEFT YAML 插件

插件同时支持 Claude Code 与 Codex。公开仓库作为 marketplace 使用，先添加
marketplace，再安装插件：

### Claude Code

```bash
claude plugin marketplace add asinkLuno/WEFT@release
claude plugin install weft-yaml@weft
```

### Codex

```bash
codex plugin marketplace add asinkLuno/WEFT --ref release
codex plugin add weft-yaml@weft
```

安装或更新后新开会话，让 Agent 加载最新的 skill。插件提供写作流程，仍需按上文
配置 WEFT MCP server，才能调用真实模型完成 schema 查询、校验和时间线解析。

## 故障排查

### 找不到或无法启动服务

1. 确认 `command` 是可执行文件的绝对路径。
2. Linux/macOS 确认文件有执行权限。
3. 确认参数是独立的 `"mcp"`，而不是命令字符串的一部分。
4. 开发版本确认仓库 `.venv` 已由 `uv sync` 创建。
5. 重新打开 Agent 会话，让客户端重新启动 MCP 子进程。

### 服务启动但没有 tools

使用客户端自己的状态命令检查：

```bash
claude mcp get weft
codex mcp get weft
```

WEFT 的 MCP stdout 只用于 JSON-RPC。普通日志如果写到 stdout 会破坏协议；
服务端日志必须写到 stderr。

### Agent 读不到故事文件

MCP 进程仍受 Agent 自身沙箱和文件权限限制。确保故事位于 Agent 被允许访问的
工作区，或在启动 Agent 时授予对应目录的读取权限。
