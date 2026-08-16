# weft-yaml for pi

The `weft-yaml` skill as a [pi package](https://github.com/badlogic/pi-coding-agent) —
teaches the pi coding agent WEFT's story format, editing rules, and validation
workflow.

## Install

From a local checkout:

```bash
pi install ./plugins/weft-yaml-pi
```

Or from GitHub (pinned to a tag or commit):

```bash
pi install git:github.com/asinkLuno/WEFT@release
```

The package declares the skill under the `pi.skills` key in `package.json`:

```json
{
  "pi": {
    "skills": ["./skills"]
  }
}
```

## Usage

Start a new agent session after installing. The skill loads on demand when you
ask for WEFT YAML work (`story`, `moai`, `moai_link`, `drift`, `narrative`,
timeline validation, …). You can also force-load it with `/skill:weft-yaml`.

For live schema access, validation, and timeline resolution, connect the WEFT
MCP server as well — see [AI & MCP](https://asinkluno.github.io/WEFT/mcp/).

## Contents

- `skills/weft-yaml/SKILL.md` — the skill body (Agent Skills standard)
- `skills/weft-yaml/references/format.md` — bundled format reference
- `skills/weft-yaml/agents/openai.yaml` — agent interface metadata

Keep the skill body in sync with `plugins/weft-yaml/` (Claude Code / Codex).
