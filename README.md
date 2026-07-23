# WEFT

WEFT is an AI-friendly world-building and story timeline tool. Its `weft-yaml`
skill helps coding agents create, edit, and validate WEFT story files.

## Install the WEFT skill from GitHub

The skill is distributed as the `weft-yaml` plugin from the
[`release`](https://github.com/asinkLuno/WEFT/tree/release) branch of this
repository.

### Codex

Add the GitHub repository as a plugin marketplace, then install the plugin:

```bash
codex plugin marketplace add asinkLuno/WEFT --ref release
codex plugin add weft-yaml@weft
```

### Claude Code

Add the GitHub repository as a plugin marketplace, then install the plugin:

```bash
claude plugin marketplace add asinkLuno/WEFT@release
claude plugin install weft-yaml@weft
```

Start a new agent session after installing or updating the plugin so the
latest skill is loaded.

The plugin provides instructions for authoring WEFT files. To let an agent
query the live schema, validate files, and resolve timelines with WEFT itself,
also configure the WEFT MCP server as described in
[AI and MCP](https://github.com/asinkLuno/WEFT/blob/release/docs/mcp.md).

## Development

```bash
uv sync
cargo tauri dev -- examples/红楼梦.yml
```

The full project documentation is available in [`docs/`](docs/index.md).
