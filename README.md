<div align="center">English | <a href="./README_zh.md">中文</a></div>

# River

> 子在川上曰：逝者如斯夫，不舍昼夜。

River is a timeline-driven writing tool designed specifically for creators.

We observed that existing tools use standardized timelines, which work for realistic themes but become inconvenient when creating works set in fictional universes. Therefore, we redesigned the time calculation algorithm to help users easily manage temporal elements in their works.

For entities involved in events, we avoid imposing excessive field restrictions to allow user customization.

Due to development constraints, we opted to use YAML files as data input instead of building a dedicated input interface, focusing solely on data visualization.

## Usage

When opening River, you need to bind a YAML file. You can freely edit the YAML file, and River will automatically refresh its data when changes are detected.

Using YAML as the data format requires understanding YAML syntax. A key advantage is its support for references, as demonstrated in the time definition section.

## Time Calculation

We employ a custom time definition system rather than standard time libraries.

A complete time definition follows this format:

```yaml
[[0, 1, 2, 3, 4, 5], 'BaseTimeName', 1, 2, 3, 4, 5, 6]
```

Where `[0, 1, 2]` represents the base time, and subsequent numbers are relative offsets. Absolute time is calculated as base time plus relative offsets. If a base time name string is included, we display the resolved relative time (e.g., "Year 2 of Tianlin"); otherwise, absolute time is shown (e.g., "2020 AD").

Time arrays support up to 6 dimensions (year, month, day, hour, minute, second). All positions accept zero, positive, and negative values. Nested calculations are permitted:

```yaml
[[[2018], '天临', 2], 1, 0, 0, 0, 0, -3]
```

YAML's variable reference capability enables complex temporal relationships between events. Note that nesting allows only one **base time** and one **base time name**.

## Data Definition

> Sample file: [story_1.yml](examples/story_1.yml)

### Story

Required configuration for basic story information:

| Field       | Definition                                                                    | Required |
| ----------- | ----------------------------------------------------------------------------- | -------- |
| title       | Story title                                                                   | Yes      |
| description | Story summary                                                                 | No       |
| date_mode   | Calendar system: `Gregorian` (default) or simplified `Chinese` lunar calendar | No       |

Example:

```yaml
story:
    title: story_1
    description: story_1 using Gregorian calendar.
    date_mode: 'Gregorian'
```

### Moai

Entities in narratives. Reserved properties:

| Field       | Definition                                | Required |
| ----------- | ----------------------------------------- | -------- |
| full_name   | Display name (shows ID if undefined)      | No       |
| base_time   | Reference time for event calculations     | No       |
| description | Entity description                        | No       |
| juncture    | Timeline of experiences (narrative-ready) | No       |
| material    | Attribute list (WIP)                      | No       |

Additional custom fields are allowed and will be displayed in the Moai tab.

### MoaiLink

| Field         | Definition                             | Required |
| ------------- | -------------------------------------- | -------- |
| moais         | Two entity IDs                         | Yes      |
| relations     | Relationship type                      | Yes      |
| bidirectional | Whether bidirectional (default: false) | No       |

### Drift

| Field       | Definition              | Required |
| ----------- | ----------------------- | -------- |
| title       | Title (≤100 characters) | Yes      |
| description | Event description       | No       |
| start_time  | Start time              | Yes      |
| end_time    | End time                | No       |
| moais       | Involved entities       | No       |

### Narrative

Group Drift events or establish observer perspectives:

| Field    | Definition      | Required |
| -------- | --------------- | -------- |
| subject  | Observed entity | Yes      |
| observer | Observer entity | No       |

### 🚧 TODO

- [ ] Internationalization
    - [x] UI localization
        - [x] Chinese
        - [x] English
        - [x] Japanese
    - [ ] Error code localization
- [x] Recently opened files history
- [ ] Custom calendar systems
- [ ] Chronological sorting for Moai Junctures
- [ ] Chart export functionality

## ⚠️ Known Issues

- Linux systems require manual GTK dependency handling
- Time range limitation: ~271,821 BCE to 275,760 CE

---
