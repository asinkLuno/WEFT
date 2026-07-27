use super::{aqueduct, errors::WeftError, phase::Phase, plugin::RhaiRuntime};
use serde::Serialize;
use serde_json::{json, Map, Value};
use serde_yaml::{Mapping, Value as Yaml};
use std::{
    collections::{BTreeMap, BTreeSet},
    fs,
    path::Path,
};

#[derive(Debug, Clone, Serialize)]
pub struct Story {
    pub title: String,
    pub description: Option<String>,
    pub date_mode: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct Moai {
    pub name: String,
    pub base_time: Option<Phase>,
    pub description: String,
    pub materials: Vec<String>,
    pub extra_props: Option<Map<String, Value>>,
    pub journal: BTreeMap<String, (String, Option<String>)>,
    pub base_time_display: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct Drift {
    pub id: String,
    pub title: String,
    pub start_time: Phase,
    pub end_time: Option<Phase>,
    pub description: Option<String>,
    pub moais: Option<Vec<String>>,
    pub flat_start: Vec<i64>,
    pub flat_end: Option<Vec<i64>>,
    pub start_tick: i64,
    pub end_tick: Option<i64>,
    pub start_time_display: String,
    pub end_time_display: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct Narrative {
    pub subject: Vec<String>,
    pub observer: String,
    pub drifts: Vec<Drift>,
}

#[derive(Debug, Clone, Serialize)]
pub struct GraphNode {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct GraphLink {
    pub source: String,
    pub target: String,
    pub label: String,
    pub relations: String,
    pub bidirectional: bool,
}

#[derive(Debug, Clone, Default, Serialize)]
pub struct LinkGraph {
    pub nodes: Vec<GraphNode>,
    pub links: Vec<GraphLink>,
}

#[derive(Debug, Clone, Serialize)]
pub struct Dao {
    pub story: Story,
    pub calendar_metadata: aqueduct::CalendarMetadata,
    pub moai: BTreeMap<String, Moai>,
    pub drift: BTreeMap<String, Vec<Drift>>,
    pub narrative: BTreeMap<String, Narrative>,
    pub link_graph: LinkGraph,
}

pub fn load(path: &Path) -> Result<Dao, WeftError> {
    if !path.is_file() {
        return Err(WeftError::FileNotFound(path.display().to_string()));
    }
    if !matches!(
        path.extension().and_then(|x| x.to_str()),
        Some("yaml" | "yml")
    ) {
        return Err(WeftError::Schema(
            "only YAML/YML story files are accepted".into(),
        ));
    }
    let source = fs::read_to_string(path).map_err(|error| WeftError::Read(error.to_string()))?;
    let root: Yaml =
        serde_yaml::from_str(&source).map_err(|error| WeftError::Parse(error.to_string()))?;
    let root = mapping(&root, "story file root")?;
    let story_raw = child_mapping(root, "story")?;
    let title = string(story_raw, "title")?;
    let date_mode = optional_string(story_raw, "date_mode")?.unwrap_or_else(|| "gregorian".into());
    let base_dir = path.parent().unwrap_or_else(|| Path::new("."));
    let calendar = aqueduct::Calendar::load(
        &date_mode,
        root.get(Yaml::String("aqueduct".into()))
            .and_then(Yaml::as_mapping),
        base_dir,
    )?;
    let calendar_metadata = calendar.metadata(&date_mode)?;
    let story = Story {
        title,
        description: optional_string(story_raw, "description")?,
        date_mode: date_mode.clone(),
    };
    let runtime = RhaiRuntime::load(
        root.get(Yaml::String("material".into()))
            .and_then(Yaml::as_mapping),
        base_dir,
    )?;
    let mut moai = BTreeMap::new();
    if let Some(raw_moais) = root.get(Yaml::String("moai".into())) {
        for (raw_name, raw_value) in mapping(raw_moais, "moai")? {
            let name = raw_name
                .as_str()
                .ok_or_else(|| WeftError::Schema("moai name must be a string".into()))?
                .to_owned();
            let raw = mapping(raw_value, &format!("moai.{name}"))?;
            let base_time = raw
                .get(Yaml::String("base_time".into()))
                .map(Phase::from_yaml)
                .transpose()?;
            let materials = string_list(raw.get(Yaml::String("materials".into())))?;
            let mut extra_props = Map::new();
            for (key, value) in raw {
                let Some(key) = key.as_str() else { continue };
                if !matches!(key, "base_time" | "description" | "materials") {
                    extra_props.insert(key.into(), yaml_json(value)?);
                }
            }
            let mut item = Moai {
                name: name.clone(),
                base_time_display: base_time
                    .as_ref()
                    .map(|phase| calendar.humanize(&phase.de_recursive()))
                    .transpose()?,
                base_time,
                description: optional_string(raw, "description")?.unwrap_or_default(),
                materials,
                extra_props: (!extra_props.is_empty()).then_some(extra_props),
                journal: BTreeMap::new(),
            };
            for material_name in item.materials.clone() {
                let context = json!({"api": 1, "moai": &item, "date_mode": &date_mode});
                let output = runtime.material(&material_name, &context)?;
                item.extra_props
                    .get_or_insert_with(Map::new)
                    .insert(material_name, output);
            }
            moai.insert(name, item);
        }
    }
    let drift = parse_drifts(root, &moai, &calendar)?;
    populate_journals(&mut moai, &drift, &calendar)?;
    let narrative = parse_narratives(root, &moai, &drift)?;
    let link_graph = parse_graph(root, &moai)?;
    Ok(Dao {
        story,
        calendar_metadata,
        moai,
        drift,
        narrative,
        link_graph,
    })
}

fn parse_drifts(
    root: &Mapping,
    moais: &BTreeMap<String, Moai>,
    calendar: &aqueduct::Calendar,
) -> Result<BTreeMap<String, Vec<Drift>>, WeftError> {
    let mut result = BTreeMap::new();
    let Some(raw) = root.get(Yaml::String("drift".into())) else {
        return Ok(result);
    };
    for (group, events) in mapping(raw, "drift")? {
        let group = group
            .as_str()
            .ok_or_else(|| WeftError::Schema("drift group must be a string".into()))?;
        let mut parsed = Vec::new();
        for (title, event) in mapping(events, group)? {
            let title = title
                .as_str()
                .ok_or_else(|| WeftError::Schema("drift title must be a string".into()))?;
            let event = mapping(event, title)?;
            let start_time =
                Phase::from_yaml(event.get(Yaml::String("start_time".into())).ok_or_else(
                    || WeftError::Schema(format!("{group}/{title} missing start_time")),
                )?)?;
            let end_time = event
                .get(Yaml::String("end_time".into()))
                .map(Phase::from_yaml)
                .transpose()?;
            let names = string_list(event.get(Yaml::String("moais".into())))?;
            for name in &names {
                if !moais.contains_key(name) {
                    return Err(WeftError::Reference(format!(
                        "{group}/{title} references unknown moai {name:?}"
                    )));
                }
            }
            let flat_start = start_time.de_recursive();
            let flat_end = end_time.as_ref().map(Phase::de_recursive);
            let start_tick = calendar.to_tick(&flat_start)?;
            let end_tick = flat_end.as_deref().map(|v| calendar.to_tick(v)).transpose()?;
            if end_tick.is_some_and(|end| end < start_tick) {
                return Err(WeftError::Schema(format!(
                    "{group}/{title} end time is before start time"
                )));
            }
            parsed.push(Drift {
                id: format!("{group}/{title}"),
                title: title.into(),
                start_time,
                end_time,
                description: optional_string(event, "description")?,
                moais: (!names.is_empty()).then_some(names),
                flat_start: flat_start.clone(),
                flat_end: flat_end.clone(),
                start_tick,
                end_tick,
                start_time_display: calendar.humanize(&flat_start)?,
                end_time_display: flat_end.as_deref().map(|v| calendar.humanize(v)).transpose()?,
            });
        }
        parsed.sort_by_key(|event| event.start_tick);
        result.insert(group.into(), parsed);
    }
    Ok(result)
}

fn parse_narratives(
    root: &Mapping,
    moais: &BTreeMap<String, Moai>,
    drifts: &BTreeMap<String, Vec<Drift>>,
) -> Result<BTreeMap<String, Narrative>, WeftError> {
    let mut result = BTreeMap::new();
    let Some(raw) = root.get(Yaml::String("narrative".into())) else {
        return Ok(result);
    };
    let by_id: BTreeMap<_, _> = drifts
        .values()
        .flatten()
        .map(|drift| (drift.id.clone(), drift.clone()))
        .collect();
    for (name, raw) in mapping(raw, "narrative")? {
        let name = name
            .as_str()
            .ok_or_else(|| WeftError::Schema("narrative name must be a string".into()))?;
        let raw = mapping(raw, name)?;
        let observer = string(raw, "observer")?;
        if !moais.contains_key(&observer) {
            return Err(WeftError::Reference(format!(
                "narrative observer {observer:?} not found"
            )));
        }
        let subject = string_list(raw.get(Yaml::String("subject".into())))?;
        let mut selected = Vec::new();
        for reference in &subject {
            if let Some(group) = drifts.get(reference) {
                selected.extend(group.clone());
            } else if let Some(event) = by_id.get(reference) {
                selected.push(event.clone());
            } else {
                return Err(WeftError::Reference(format!(
                    "narrative subject {reference:?} not found"
                )));
            }
        }
        if let Some(absent) = selected
            .iter()
            .find(|d| !d.moais.as_deref().unwrap_or(&[]).contains(&observer))
        {
            return Err(WeftError::Reference(format!(
                "{observer:?} not in event {:?}",
                absent.id
            )));
        }
        result.insert(
            name.into(),
            Narrative {
                subject,
                observer,
                drifts: selected,
            },
        );
    }
    Ok(result)
}

fn parse_graph(root: &Mapping, moais: &BTreeMap<String, Moai>) -> Result<LinkGraph, WeftError> {
    let mut graph = LinkGraph::default();
    let mut node_names = BTreeSet::new();
    let Some(raw) = root.get(Yaml::String("moai_link".into())) else {
        return Ok(graph);
    };
    for (label, links) in mapping(raw, "moai_link")? {
        let label = label
            .as_str()
            .ok_or_else(|| WeftError::Schema("relationship group must be a string".into()))?;
        let links: Vec<serde_yaml::Value> = serde_yaml::from_value(links.clone())
            .map_err(|_| WeftError::Schema("relationship group must be a list".into()))?;
        for link in &links {
            let link = mapping(link, label)?;
            let targets = string_list(link.get(Yaml::String("moais".into())))?;
            if targets.len() != 2 {
                return Err(WeftError::Schema("moai_link.moais must have exactly two names".into()));
            }
            for target in &targets {
                if !moais.contains_key(target) {
                    return Err(WeftError::Reference(format!("relationship references unknown moai {target:?}")));
                }
                node_names.insert(target.clone());
            }
            graph.links.push(GraphLink {
                source: targets[0].clone(),
                target: targets[1].clone(),
                label: label.into(),
                relations: string(link, "relations")?,
                bidirectional: link
                    .get(Yaml::String("bidirectional".into()))
                    .and_then(Yaml::as_bool)
                    .unwrap_or(true),
            });
        }
    }
    graph.nodes = node_names
        .into_iter()
        .map(|name| GraphNode {
            id: name.clone(),
            name,
        })
        .collect();
    Ok(graph)
}

fn populate_journals(
    moais: &mut BTreeMap<String, Moai>,
    drifts: &BTreeMap<String, Vec<Drift>>,
    calendar: &aqueduct::Calendar,
) -> Result<(), WeftError> {
    for drift in drifts.values().flatten() {
        for name in drift.moais.as_deref().unwrap_or(&[]) {
            let Some(moai) = moais.get_mut(name) else {
                continue;
            };
            let Some(base) = moai.base_time.as_ref().map(Phase::de_recursive) else {
                continue;
            };
            let n = calendar.component_count();
            let mut start = vec![0; n];
            for i in 0..n {
                start[i] = drift.flat_start[i] - base[i];
            }
            let end = drift
                .flat_end
                .as_ref()
                .map(|flat| {
                    let mut value = vec![0; n];
                    for i in 0..n {
                        value[i] = flat[i] - base[i];
                    }
                    calendar
                        .normalize(&value)
                        .and_then(|v| calendar.humanize(&v))
                })
                .transpose()?;
            let start = calendar.normalize(&start)?;
            moai.journal
                .insert(drift.id.clone(), (calendar.humanize(&start)?, end));
        }
    }
    Ok(())
}

fn mapping<'a>(value: &'a Yaml, label: &str) -> Result<&'a Mapping, WeftError> {
    value
        .as_mapping()
        .ok_or_else(|| WeftError::Schema(format!("{label} must be a mapping")))
}
fn child_mapping<'a>(root: &'a Mapping, key: &str) -> Result<&'a Mapping, WeftError> {
    root.get(Yaml::String(key.into()))
        .ok_or_else(|| WeftError::Schema(format!("missing {key}")))
        .and_then(|value| mapping(value, key))
}
fn string(mapping: &Mapping, key: &str) -> Result<String, WeftError> {
    optional_string(mapping, key)?.ok_or_else(|| WeftError::Schema(format!("{key} must be a string")))
}
fn optional_string(mapping: &Mapping, key: &str) -> Result<Option<String>, WeftError> {
    match mapping.get(Yaml::String(key.into())) {
        None | Some(Yaml::Null) => Ok(None),
        Some(Yaml::String(value)) => Ok(Some(value.clone())),
        Some(_) => Err(WeftError::Schema(format!("{key} must be a string"))),
    }
}
fn string_list(value: Option<&Yaml>) -> Result<Vec<String>, WeftError> {
    let Some(value) = value else {
        return Ok(Vec::new());
    };
    serde_yaml::from_value(value.clone())
        .map_err(|_| WeftError::Schema("this field must be a list of strings".into()))
}
fn yaml_json(value: &Yaml) -> Result<Value, WeftError> {
    serde_json::to_value(value).map_err(|error| WeftError::Schema(error.to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn loads_rhai_calendar_example() {
        let path = Path::new(env!("CARGO_MANIFEST_DIR")).join("../examples/黑暗的左手.yml");
        let dao = match load(&path) {
            Ok(d) => d,
            Err(e) => panic!("load failed: {e:?}"),
        };
        assert_eq!(dao.story.date_mode, "gethen");
        assert_eq!(dao.calendar_metadata.source, "plugin");
        assert_eq!(dao.calendar_metadata.components, 4);
        assert!(!dao.drift.is_empty());
    }

}
