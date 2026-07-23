# WEFT format reference

Use this bundled reference for the stable file shape. Prefer the installed WEFT `get_story_schema` MCP result when available.

## Minimal example

```yaml
story:
  title: Example
  description: A small timeline

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

- `story`: required mapping. `title` must be a string; `description` is optional. The supported `date_mode` is `gregorian`.
- `material`: optional mapping from material registration names to Python file paths. Material code is executed when loading a story; use only trusted files.
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

## Time lists

Gregorian positions are `[year, month, day, hour, minute, second]`. Short lists are padded with zeros. A trailing nested list makes the preceding integers an offset from that reference:

```yaml
start_time: &arrival [2025, 4, 2, 10]
end_time: [0, 0, 0, 2, *arrival] # two hours after arrival
```

YAML aliases expand to the referenced list before WEFT parses the time. Validate every relative-time edit with the real timeline resolver.

## Narratives

- `subject`: required list of drift group names or exact `group/event` IDs. Groups expand to all their events.
- `observer`: required existing entity name.
- The observer must occur in every selected event's `moais`.

Use a group reference for a whole arc and an event ID for precise selection. WEFT resolves event order from the timeline.
