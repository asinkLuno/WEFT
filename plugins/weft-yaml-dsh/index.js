/**
 * weft-yaml-dsh: registers the bundled `weft-yaml` skill on `ctx.skills`.
 *
 * Mirrors the official `@deepseek-ai/dsh-skill-badge` provider shape: a
 * duck-typed SkillProvider with no external dependencies beyond the `skills`
 * service from the base bundle (`@deepseek-ai/dsh-skill`).
 */

import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const PROVIDER_NAME = 'weft-yaml-dsh'
const SKILL_DIR = new URL('./skills/', import.meta.url)
const SKILL_BODY_URL = new URL('./skills/weft-yaml/SKILL.md', import.meta.url)
const RESOURCE_BASE = {
  kind: 'directory',
  path: fileURLToPath(SKILL_DIR),
}
const INVOCATION = { modelInvocable: true, userInvocable: true }
// Bundled skills share the built-in bundled rank; project/user skills win over it.
const BUNDLED_SKILL_RANK = 600
const DESCRIPTION =
  'Create, edit, review, and validate WEFT story files containing world-building entities, relationships, event timelines, relative dates, and point-of-view narratives. Use for WEFT YAML, YML, JSON, or TOML files; requests involving story, moai, moai_link, drift, narrative, base_time, start_time, end_time, or WEFT timeline validation; and conversions of outlines or lore into WEFT format.'

const CANDIDATE = {
  name: 'weft-yaml',
  description: DESCRIPTION,
  invocation: INVOCATION,
  provider: PROVIDER_NAME,
  source: 'bundled',
  resourceBase: RESOURCE_BASE,
  rank: BUNDLED_SKILL_RANK,
  locator: SKILL_BODY_URL,
}

const provider = {
  name: PROVIDER_NAME,
  list: () => Promise.resolve([CANDIDATE]),
  async get() {
    return {
      ...CANDIDATE,
      content: await readFile(SKILL_BODY_URL, 'utf8'),
    }
  },
}

/** Cordis plugin name. */
export const name = 'weft-yaml'
/** Service required by the bundled provider. */
export const inject = ['skills']

/** Register the bundled `weft-yaml` provider on `ctx.skills`. */
export function apply(ctx) {
  ctx.skills.registerProvider(() => provider)
}
