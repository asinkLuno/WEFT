# WEFT

WEFT is an AI-native world-building and story timeline tool. The timeline UI is
only one part of the product: the primary workflow is to let an AI agent manage
the structured story file for you.

After installing the `weft-yaml` skill and connecting the WEFT MCP server, a
writer can give the agent direct, natural-language instructions:

> Add an event in Chapter 3 where Alice meets Bob at the station, two days
> after the hearing.

The agent understands the WEFT format, edits the appropriate entities, events,
relationships, and relative dates, then validates the result with the real
WEFT backend. Writers do not need to learn or manually maintain YAML.

The two AI integrations have complementary roles:

- **`weft-yaml` skill** teaches the agent how to author and revise WEFT stories.
- **WEFT MCP server** exposes the live schema, validation, story inspection,
  and timeline resolution backed by the same Python model as the desktop app.

The desktop application remains useful for visually inspecting the resulting
timeline, entity relationships, and point-of-view narratives.

## Two design principles

### AI-native

Writers describe their intent in natural language. Skills teach the agent how
to edit a WEFT story, MCP validates the result with the real backend, and the
desktop app makes the resulting structure visible.

### Boundaryless

WEFT deliberately avoids imposing a fixed ontology on a fictional world. Its
two core primitives are:

- **Moai** — anything that exists in or is observed through time: a person, a
  city, a dynasty, a sword, a storm, or an idea.
- **Drift** — anything that happens to or around those entities.

A Moai can carry author-defined properties, and materials can derive new
properties from them. WEFT does not prescribe concepts such as character
classes, locations, factions, ages, or magic systems; authors and their agents
model those concepts as their story requires.

Time is equally open. Gregorian dates are built in, but an Aqueduct plugin can
define a fictional calendar's units, carry rules, formatting, and timeline
coordinates. The data model supplies structure without deciding what a world
is allowed to contain or how that world measures time.

Narrative is intentionally stricter than world-building. It prepares selected
events for the eventual novel, where a stable point of view is a basic writing
discipline. Every Narrative names one observer, and that observer must be
present in every selected event. WEFT leaves the world open while making the
chosen telling of that world explicit and internally consistent.

### The river metaphor

WEFT's domain names belong to one metaphor rather than being arbitrary jargon.
`Dao` is the Chinese **道**: the way through which the whole story is assembled.
Its image of time comes from Confucius watching a river: “What passes is like
this, never ceasing day or night.” A `Drift` is an event carried along by that
unceasing flow.

A `Moai` is a stone standing in the water while events flow past it. The name
comes from the monumental statues of Easter Island; `stone` expressed the idea
but was too ordinary for a central story concept. An `Aqueduct` channels the
water and determines how it moves, just as a calendar determines the units,
carry rules, representation, and direction of story time.

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

The skill is enough to teach an agent the authoring workflow. To let it query
the live schema, validate its edits, and resolve timelines with WEFT itself,
also configure the WEFT MCP server as described in
[AI and MCP](https://github.com/asinkLuno/WEFT/blob/release/docs/mcp.md).

## Development

```bash
uv sync
cargo tauri dev -- examples/红楼梦.yml
```

The full project documentation is available in [`docs/`](docs/index.md).
