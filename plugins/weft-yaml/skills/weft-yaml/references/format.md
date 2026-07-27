# WEFT format reference

Use this bundled reference for the stable file shape. Prefer the installed WEFT `get_story_schema` MCP result when available.

## Minimal example

```yaml
story:
  title: Example
  description: A small timeline
  date_mode: gregorian

moai:
  Alice:
    base_time: &alice_birth [2000, 1, 1]
    description: Protagonist
  Bob:
    description: Alice's friend

moai_link:
  Friends:
    - moais: [Alice, Bob]
      relations: friends

drift:
  Opening:
    Meeting:
      start_time: &meeting [2025, 4, 2, 10, 0]
      end_time: [0, 0, 0, 2, *meeting]
      moais: [Alice, Bob]
      description: Alice and Bob meet.

narrative:
  Alice POV:
    subject: [Opening]
    observer: Alice
```

## Top-level fields

- `story`: required mapping. `title` must be a string; `description` is optional. `date_mode` selects a registered aqueduct and defaults to `gregorian`; built-ins are `gregorian` and `gregorian_en`.
- `aqueduct`: optional mapping from calendar registration names to Rhai plugin manifests. Each manifest uses `runtime: rhai`, `kind: calendar`, `api: 1`, and a story-relative `source`.
- `material`: optional mapping from material registration names to Rhai plugin manifests. Each manifest uses `runtime: rhai`, `kind: material`, `api: 1`, a story-relative `source`, and an optional `entry` function name.
- `moai`: entity mapping keyed by unique entity name.
- `moai_link`: relationship groups, each containing link objects.
- `drift`: event groups, each containing events keyed by title.
- `narrative`: POV outlines keyed by outline name.

## Entities and relationships

An entity accepts:

- `description`: string, default empty.
- `base_time`: optional time list, often birth, creation, or story origin.
- `materials`: optional list of registered material names.
- Additional properties are preserved as entity-specific data.

A relationship accepts:

- `moais`: exactly two existing entity names.
- `relations`: relationship description.
- `bidirectional`: optional boolean, default `true`.

## Events

Each event accepts:

- `start_time`: required time list.
- `end_time`: optional time list; it cannot resolve earlier than `start_time`.
- `moais`: optional list of participating existing entities.
- `description`: optional text.

An event ID is `group/event`. Keep the event title at 20 characters or fewer.

## Calendar selection and plugins

`story.date_mode` selects one calendar for every entity and event in the story.
It defaults to `gregorian`. The built-ins are:

- `gregorian`: Gregorian rules with Chinese unit labels.
- `gregorian_en`: the same Gregorian rules with English display text.

A custom calendar is a restricted Rhai script. Register it at top level using a
path relative to the story file, then select its name in `story.date_mode`:

```yaml
aqueduct:
  gethen:
    runtime: rhai
    kind: calendar
    api: 1
    source: ./calendars/gethen.rhai

story:
  title: A Gethenian story
  date_mode: gethen
```

The script must export `metadata()`, `normalize(values)`, `to_tick(values)`, and
`humanize(values)`. It receives a fixed six-component array; metadata `units`
declares the meaningful display levels.

## Time lists

For the built-in Gregorian calendars, positions are
`[year, month, day, hour, minute, second]`. Custom calendars receive the same
six slots but may assign their own meaning to the active prefix.

A list may omit trailing units and WEFT zero-pads it to the active calendar's
Brick count. It cannot contain more integer components than that count. Values
must be integers (not booleans or floats).

A trailing nested list makes the preceding integers an offset from that
reference:

```yaml
start_time: &arrival [2025, 4, 2, 10]
end_time: [0, 0, 0, 2, *arrival] # two hours after arrival
```

YAML aliases expand to the referenced list before WEFT parses the time. Absolute
times, offsets, and their references all use the story's selected calendar.
Validate every calendar or relative-time edit with the real timeline resolver,
then inspect its `date_mode` and formatted results.

## Narratives

- `subject`: required list of drift group names or exact `group/event` IDs. Groups expand to all their events.
- `observer`: required existing entity name.
- The observer must occur in every selected event's `moais`.

Use a group reference for a whole arc and an event ID for precise selection.
Group references expand in the event order written in the story file; WEFT does
not currently re-sort a narrative by resolved time.
