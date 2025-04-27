<div align="center">

# InkRiver

<p align="center">
    <strong>Craft any world, timeline, or reality - writing tools without boundaries</strong>
  </p>

<p align="center">
    English | <a href="./README_zh.md">中文</a>
  </p>

<p align="center">
    <img src="https://img.shields.io/badge/tauri-%2324C8DB.svg?style=for-the-badge&logo=tauri&logoColor=%23FFFFFF" alt="Tauri" />
    <img src="https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB" alt="React" />
  </p>
</div>

> 子在川上曰，逝者如斯夫，不舍昼夜。

We've observed that existing creative tools generally employ standardized timelines, which work well for realistic fiction but prove extremely limiting when building fictional worlds or fantasy universes with non-conventional temporal systems. Based on this pain point, we've implemented two core innovations:

- Adaptive Time Algorithm: We've reconstructed the traditional time management model, creating a fully customizable time system that allows creators to easily design and manage proprietary calendars, epochs, and time flow rules specific to their works. This seamlessly supports diverse creative needs ranging from science fiction futures to fantasy worlds.
- Entity Object Generic Architecture: We've adopted a highly flexible data structure design that enables core elements such as characters, locations, and props to support unlimited dimensional attribute expansion. Creators can freely define unique characteristics and parameters according to their work's requirements, breaking through the attribute limitations of traditional creative tools.

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

| Field | Definition | Required |
| ----------- | ----------------------------------------------------------------------------- | -------- |
| title | Story title | Yes |
| description | Story summary | No |
| date_mode | Calendar system: `Gregorian` (default) or simplified `Chinese` lunar calendar | No |

Example:

```yaml
story:
    title: story_1
    description: story_1 using Gregorian calendar.
    date_mode: 'Gregorian'
```

### Moai

Entities in narratives. Reserved properties:

| Field | Definition | Required |
| ----------- | ----------------------------------------- | -------- |
| full_name | Display name (shows ID if undefined) | No |
| base_time | Reference time for event calculations | No |
| description | Entity description | No |
| juncture | Timeline of experiences (narrative-ready) | No |
| material | Attribute list (WIP) | No |

Additional custom fields are allowed and will be displayed in the Moai tab：

<img width="912" alt="截屏2025-03-13 22 34 57" src="https://github.com/user-attachments/assets/715b2d34-7c1a-4ccb-8f57-46d2fcf83033" />

### MoaiLink

| Field | Definition | Required |
| ------------- | -------------------------------------- | -------- |
| moais | Two entity IDs | Yes |
| relations | Relationship type | Yes |
| bidirectional | Whether bidirectional (default: false) | No |

<img width="1292" alt="截屏2025-03-13 22 32 59" src="https://github.com/user-attachments/assets/56c7a1a1-8639-4e57-b9f6-3790830b666a" />

### Drift

| Field | Definition | Required |
| ----------- | ----------------------- | -------- |
| title | Title (≤100 characters) | Yes |
| description | Event description | No |
| start_time | Start time | Yes |
| end_time | End time | No |
| moais | Involved entities | No |

<img width="1292" alt="截屏2025-03-13 22 33 47" src="https://github.com/user-attachments/assets/bb6a071d-a4cf-455a-a4cf-35742e6b278f" />

### Narrative

Group Drift events or establish observer perspectives:

| Field | Definition | Required |
| -------- | --------------- | -------- |
| subject | Observed entity | Yes |
| observer | Observer entity | No |

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
- [ ] props clustering

## ⚠️ Known Issues

- Linux systems require manual GTK dependency handling
- Since the front-end Gantt chart component is built upon the TypeScript standard time library, our current time range support is temporarily limited to 271821 BC - 275760 AD. We're actively working to remove this constraint.
