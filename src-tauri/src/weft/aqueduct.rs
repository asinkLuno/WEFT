use super::{
    errors::WeftError,
    phase::PHASE_LEN,
    plugin::{calendar_source, RhaiCalendar},
};
use serde::Serialize;
use serde_json::{Map, Value};
use serde_yaml::Mapping;
use std::path::Path;

const GREGORIAN_CORE: &str = include_str!("../../rhai/gregorian_core.rhai");
const GREGORIAN_CN: &str = include_str!("../../rhai/gregorian_cn.rhai");
const GREGORIAN_EN: &str = include_str!("../../rhai/gregorian_en.rhai");
const GREGORIAN_JA: &str = include_str!("../../rhai/gregorian_ja.rhai");

#[derive(Debug, Clone, Serialize)]
pub struct CalendarMetadata {
    pub name: String,
    pub title: String,
    pub description: String,
    pub units: Vec<String>,
    pub source: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub extra_props: Option<Map<String, Value>>,
}

#[derive(Debug)]
pub struct Calendar {
    inner: Box<RhaiCalendar>,
}

impl Calendar {
    pub fn load(name: &str, spec: Option<&Mapping>, base: &Path) -> Result<Self, WeftError> {
        let inner = match name {
            "gregorian" => {
                let script = format!("{GREGORIAN_CORE}\n{GREGORIAN_CN}");
                RhaiCalendar::load_script(name, &script)?
            }
            "gregorian_en" => {
                let script = format!("{GREGORIAN_CORE}\n{GREGORIAN_EN}");
                RhaiCalendar::load_script(name, &script)?
            }
            "gregorian_ja" => {
                let script = format!("{GREGORIAN_CORE}\n{GREGORIAN_JA}");
                RhaiCalendar::load_script(name, &script)?
            }
            other => {
                let source = calendar_source(spec, other)?;
                RhaiCalendar::load(other, &base.join(source))?
            }
        };
        Ok(Self {
            inner: Box::new(inner),
        })
    }

    pub fn metadata(&self, name: &str) -> Result<CalendarMetadata, WeftError> {
        let value = self.inner.metadata()?;
        let known: [&str; 3] = ["title", "description", "units"];
        let extra_props = value
            .as_object()
            .map(|obj| {
                obj.iter()
                    .filter(|(k, _)| !known.contains(&k.as_str()))
                    .map(|(k, v)| (k.clone(), v.clone()))
                    .collect::<Map<_, _>>()
            })
            .filter(|m| !m.is_empty());
        Ok(CalendarMetadata {
            name: name.into(),
            title: value
                .get("title")
                .and_then(Value::as_str)
                .unwrap_or(name)
                .into(),
            description: value
                .get("description")
                .and_then(Value::as_str)
                .unwrap_or_default()
                .into(),
            units: value
                .get("units")
                .and_then(Value::as_array)
                .into_iter()
                .flatten()
                .filter_map(Value::as_str)
                .map(str::to_owned)
                .collect(),
            source: "plugin".into(),
            extra_props,
        })
    }

    pub fn normalize(&self, value: [i64; PHASE_LEN]) -> Result<[i64; PHASE_LEN], WeftError> {
        let normalized = self.inner.normalize(&value)?;
        normalized
            .try_into()
            .map_err(|_| WeftError::Plugin("normalize must return six time components".into()))
    }

    pub fn humanize(&self, value: [i64; PHASE_LEN]) -> Result<String, WeftError> {
        self.inner.humanize(&value.to_vec())
    }

    pub fn to_tick(&self, value: [i64; PHASE_LEN]) -> Result<i64, WeftError> {
        self.inner.to_tick(&value)
    }

    pub fn extra(&self, value: [i64; PHASE_LEN]) -> Result<Value, WeftError> {
        self.inner.extra(&value.to_vec())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn leap_year_and_tick_distance() {
        let cal =
            Calendar::load("gregorian", None, Path::new("")).unwrap();
        let a = cal.to_tick([2024, 2, 28, 0, 0, 0]).unwrap();
        let b = cal.to_tick([2024, 3, 1, 0, 0, 0]).unwrap();
        assert_eq!(b - a, 2 * 86400);
    }
}
