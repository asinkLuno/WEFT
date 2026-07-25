---
name: weft-yaml
description: Create, edit, review, and validate WEFT story files containing world-building entities, relationships, event timelines, relative dates, and point-of-view narratives. Use for WEFT YAML, YML, JSON, or TOML files; requests involving story, moai, moai_link, drift, narrative, base_time, start_time, end_time, or WEFT timeline validation; and conversions of outlines or lore into WEFT format.
---

# WEFT Story Files

Build structurally valid WEFT stories while preserving author intent and referential integrity. Prefer YAML unless the user requests JSON or TOML.

## Workflow

1. Inspect the target file and nearby project instructions. For a new story, read [format.md](references/format.md) before drafting.
2. If the WEFT MCP tools are available, call `get_story_schema` before creating unfamiliar structures. Treat its schema as authoritative when it differs from the bundled reference.
3. Determine the active calendar from `story.date_mode` before interpreting or writing any time list. It defaults to `gregorian`; a different name must be a built-in calendar or be registered by top-level `aqueduct`.
4. When a story uses a custom calendar, inspect its trusted Python module (resolved relative to the story file) to learn the ordered Brick units, carry rules, display rules, and whether it provides `to_tick`. Do not assume Gregorian units or six components.
5. Make the smallest coherent edit. Preserve existing names, YAML anchors, comments, ordering conventions, calendar selection, and prose style.
6. Check every reference:
   - `moai_link[].moais` and `drift.*.*.moais` must name existing `moai`.
   - `narrative.*.observer` must name an existing `moai`.
   - Each narrative subject must be a drift group or `group/event` ID.
   - The observer must appear in every selected event.
7. Validate after every edit:
   - Prefer the WEFT MCP `validate_story` tool using an absolute path.
   - If the tool is unavailable, state that validation was not executed; do not substitute generic YAML parsing for WEFT validation.
8. After changing `story.date_mode`, `aqueduct`, `base_time`, `start_time`, `end_time`, anchors, or relative-time references, call MCP `resolve_timeline`. Inspect the selected calendar, formatted absolute times, chronology, and entity offsets, not merely tool success.
9. Fix all validation errors introduced by the edit. Never claim the file is valid unless the real WEFT validator succeeds.

## Editing Rules

- Keep the top-level shape explicit: `story`, optional `aqueduct`, optional `material`, `moai`, `moai_link`, `drift`, and `narrative`.
- Use unique, stable entity and event names. Event IDs are derived as `group/event`.
- Select one calendar for the whole story with `story.date_mode`. Built-ins are `gregorian` and `gregorian_en`; both use `[year, month, day, hour, minute, second]`.
- Register a custom calendar at top-level `aqueduct` as `name: path`, then select that same name with `story.date_mode`. The module must export an `Aqueduct` instance named `aqueduct`; paths are relative to the story file.
- Represent time using the selected calendar's ordered Brick units. A time list may omit trailing units and WEFT zero-pads it to that calendar's Brick count; it must not contain more integer components than the calendar has.
- Represent a relative time by appending another time list or YAML alias as the last element, for example `[0, 0, 3, *arrival]`.
- Keep every absolute time, offset, and referenced time in the same selected calendar. Do not convert a custom-calendar story to Gregorian unless the user asks.
- Custom calendar modules are executable Python and must be trusted. A custom calendar used by events with `end_time` must provide `to_tick` so WEFT can compare the endpoints.
- Use anchors for dates reused as reference points. Do not duplicate long nested relative-time chains when an anchor is clearer.
- Ensure `end_time` is not earlier than `start_time`.
- Keep drift event titles at 20 characters or fewer.
- Use `description` for story facts and prose; do not invent facts the user did not provide. Mark genuinely unknown information explicitly or omit it.
- Put POV selection in top-level `narrative`, not inside `drift`.
- Do not hand-edit computed fields such as resolved dates or entity journals; WEFT derives them.

## Tool Selection

- `inspect_story`: summarize a valid file before a broad edit.
- `list_moai`: inspect entity names, anchors, materials, and derived properties.
- `get_narrative`: verify the resolved order and observer for one narrative.
- `get_story_schema`: resolve uncertainty about the current installed WEFT version.
- `validate_story`: required final structural and cross-reference check.
- `resolve_timeline`: required after time or relative-reference edits.

When reporting completion, name the file changed, summarize validation performed, and flag any unresolved chronology or missing facts.
