---
name: weft-yaml
description: Create, edit, review, and validate WEFT YAML story files containing world-building entities, relationships, event timelines, relative dates, and point-of-view narratives. Use for WEFT YAML or YML files; requests involving story, moai, moai_link, drift, narrative, base_time, start_time, end_time, or WEFT timeline validation; and conversions of outlines or lore into WEFT format.
---

# WEFT Story Files

Build structurally valid WEFT YAML stories while preserving author intent and referential integrity.

## Workflow

1. Inspect the target file and nearby project instructions. For a new story, read [format.md](references/format.md) before drafting.
2. Use the bundled format reference as the authoritative file shape.
3. Determine the active calendar from `story.date_mode` before interpreting or writing any time list. It defaults to `gregorian`; a different name must be a built-in calendar or be registered by top-level `aqueduct`.
4. When a story uses a custom calendar, inspect its restricted Rhai script (resolved relative to the story file) to learn its metadata, normalization, display rules, and timeline conversion. Do not assume Gregorian unit meanings.
5. Make the smallest coherent edit. Preserve existing names, YAML anchors, comments, ordering conventions, calendar selection, and prose style.
6. Check every reference:
   - `moai_link[].moais` and `drift.*.*.moais` must name existing `moai`.
   - `narrative.*.observer` must name an existing `moai`.
   - Each narrative subject must be a drift group or `group/event` ID.
   - The observer must appear in every selected event.
7. Validate after every edit:
   - Prefer the WEFT MCP `load_story` tool using an absolute path; successful loading is the structural and cross-reference validation.
   - If the tool is unavailable, state that validation was not executed; do not substitute generic YAML parsing for WEFT validation.
8. After changing `story.date_mode`, `aqueduct`, `base_time`, `start_time`, `end_time`, anchors, or relative-time references, call MCP `get_story`, `get_timeline`, and `list_moai` after loading. Inspect the selected calendar, formatted absolute times, chronology, and entity offsets, not merely tool success.
9. Fix all validation errors introduced by the edit. Never claim the file is valid unless the real WEFT validator succeeds.

## Editing Rules

- Keep the top-level shape explicit: `story`, optional `aqueduct`, optional `material`, `moai`, `moai_link`, `drift`, and `narrative`.
- Use unique, stable entity and event names. Event IDs are derived as `group/event`.
- Select one calendar for the whole story with `story.date_mode`. Built-ins are `gregorian`, `gregorian_en`, and `gregorian_ja`; all three use `[year, month, day, hour, minute, second]` and share the same Gregorian rules with different locale display.
- Register a custom calendar at top-level `aqueduct` with a Rhai plugin manifest, then select that same name with `story.date_mode`. Set `runtime: rhai`, `kind: calendar`, `api: 1`, and a `source` path relative to the story file.
- Represent time using the selected calendar's ordered time components. A time list may omit trailing components and WEFT zero-pads it to that calendar's component count; it must not contain more integer components than the calendar has.
- Represent a relative time by appending another time list or YAML alias as the last element, for example `[0, 0, 3, *arrival]`.
- Keep every absolute time, offset, and referenced time in the same selected calendar. Do not convert a custom-calendar story to Gregorian unless the user asks.
- Custom calendar scripts run in a restricted Rhai runtime without filesystem or network access. They must export `metadata()`, `normalize(values)`, `to_tick(values)`, and `humanize(values)`.
- Use anchors for dates reused as reference points. Do not duplicate long nested relative-time chains when an anchor is clearer.
- Ensure `end_time` is not earlier than `start_time`.
- Use `description` for story facts and prose; do not invent facts the user did not provide. Mark genuinely unknown information explicitly or omit it.
- Put POV selection in top-level `narrative`, not inside `drift`.
- Do not hand-edit computed fields such as resolved dates or entity journals; WEFT derives them.

## Tool Selection

- `load_story`: load and validate a story before inspection or after an edit.
- `get_story`: inspect story metadata and the selected calendar.
- `list_moai`: inspect entity names, anchors, materials, and derived properties.
- `get_timeline`: inspect resolved event order, formatted times, and chronology.
- `get_narratives`: verify resolved narrative order and observers.

When reporting completion, name the file changed, summarize validation performed, and flag any unresolved chronology or missing facts.
