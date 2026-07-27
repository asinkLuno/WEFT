use super::{
    errors::WeftError,
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
    pub components: usize,
    pub source: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub extra_props: Option<Map<String, Value>>,
}

#[derive(Debug)]
pub struct Calendar {
    inner: Box<RhaiCalendar>,
    component_count: usize,
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
        let component_count = inner
            .metadata()
            .ok()
            .and_then(|v| v.get("components").and_then(Value::as_u64))
            .unwrap_or(6) as usize;
        Ok(Self {
            inner: Box::new(inner),
            component_count,
        })
    }

    pub fn component_count(&self) -> usize {
        self.component_count
    }

    pub fn metadata(&self, name: &str) -> Result<CalendarMetadata, WeftError> {
        let value = self.inner.metadata()?;
        let known: [&str; 3] = ["title", "description", "components"];
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
            components: value.get("components").and_then(Value::as_u64).unwrap_or(6) as usize,
            source: "plugin".into(),
            extra_props,
        })
    }

    fn pad_to_count(&self, values: &[i64]) -> Vec<i64> {
        let mut v = values.to_vec();
        v.resize(self.component_count, 0);
        v
    }

    pub fn normalize(&self, values: &[i64]) -> Result<Vec<i64>, WeftError> {
        let padded = self.pad_to_count(values);
        let result = self.inner.normalize(&padded)?;
        if result.len() != self.component_count {
            return Err(WeftError::Plugin(format!(
                "normalize must return {} time components",
                self.component_count
            )));
        }
        Ok(result)
    }

    pub fn humanize(&self, values: &[i64]) -> Result<String, WeftError> {
        let padded = self.pad_to_count(values);
        self.inner.humanize(&padded)
    }

    pub fn to_tick(&self, values: &[i64]) -> Result<i64, WeftError> {
        let padded = self.pad_to_count(values);
        self.inner.to_tick(&padded)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn leap_year_and_tick_distance() {
        let cal = Calendar::load("gregorian", None, Path::new("")).unwrap();
        let a = cal.to_tick(&[2024, 2, 28, 0, 0, 0]).unwrap();
        let b = cal.to_tick(&[2024, 3, 1, 0, 0, 0]).unwrap();
        assert_eq!(b - a, 2 * 86400);
    }
}
