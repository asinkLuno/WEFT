# weft-yaml for DeepSeek Harness (dsh)

A [DeepSeek Harness](https://deepseek.com/harness/) plugin bundle that registers
the `weft-yaml` skill on `ctx.skills` — teaches the dsh agent WEFT's story
format, editing rules, and validation workflow.

It ships the skill body (Agent Skills standard) and a minimal Cordis provider
plugin modeled on `@deepseek-ai/dsh-skill-badge`; no external dependencies.

## Install

From the directory that contains this package (e.g. a WEFT checkout):

```bash
dsh plugin --profile demo add ./plugins/weft-yaml-dsh
```

`dsh plugin` forwards to pnpm in the profile, links the checkout, and appends
the bundle to `dsh.profile.bundles` because `package.json` declares
`dsh.bundle`. Then start dsh with that profile:

```bash
dsh --profile demo
```

Verify the layer without booting:

```bash
dsh --profile demo --dump-config   # shows a "# == weft-yaml-dsh" layer
```

Remove with:

```bash
dsh plugin --profile demo remove weft-yaml-dsh
```

## How it works

- `cordis.patch.yml` inserts a `weft-yaml` plugin row into the composition.
- `index.js` registers a bundled `SkillProvider` on `ctx.skills` serving
  `skills/weft-yaml/SKILL.md`, with `skills/` as the resource base for
  relative references (`references/format.md`, `agents/openai.yaml`).
- Rank `600` (bundled) means project-local skills in `.dsh/skills` or
  `.agents/skills` override this copy if the user maintains their own.

## Usage

Start a new session after installing. The skill appears in the session skill
catalog and loads on demand via the model-facing `skill` tool; you can also
invoke it manually with `/skill:weft-yaml`. For live schema access,
validation, and timeline resolution, connect the WEFT MCP server as well — see
[AI & MCP](https://asinkluno.github.io/WEFT/mcp/).

Keep the skill body in sync with `plugins/weft-yaml/` (Claude Code / Codex).
