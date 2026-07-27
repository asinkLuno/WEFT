use super::{
    errors::WeftError,
    phase::PHASE_LEN,
    plugin::{calendar_source, RhaiCalendar},
};
use serde::Serialize;
use serde_yaml::Mapping;
use std::path::Path;

const GREGORIAN_CORE: &str = include_str!("../../rhai/gregorian_core.rhai");
const GREGORIAN_CN: &str = include_str!("../../rhai/gregorian_cn.rhai");
const GREGORIAN_EN: &str = include_str!("../../rhai/gregorian_en.rhai");

#[derive(Debug, Clone, Serialize)]
pub struct CalendarMetadata {
    pub name: String,
    pub title: String,
    pub description: String,
    pub units: Vec<String>,
    pub source: String,
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
        Ok(CalendarMetadata {
            name: name.into(),
            title: value
                .get("title")
                .and_then(serde_json::Value::as_str)
                .unwrap_or(name)
                .into(),
            description: value
                .get("description")
                .and_then(serde_json::Value::as_str)
                .unwrap_or_default()
                .into(),
            units: value
                .get("units")
                .and_then(serde_json::Value::as_array)
                .into_iter()
                .flatten()
                .filter_map(serde_json::Value::as_str)
                .map(str::to_owned)
                .collect(),
            source: "plugin".into(),
        })
    }

    pub fn normalize(&self, value: [i64; PHASE_LEN]) -> Result<[i64; PHASE_LEN], WeftError> {
        let normalized = self.inner.normalize(&value)?;
        normalized
            .try_into()
            .map_err(|_| WeftError::Plugin("normalize 必须返回六个时间分量".into()))
    }

    pub fn humanize(&self, value: [i64; PHASE_LEN]) -> Result<String, WeftError> {
        self.inner.humanize(&value.to_vec())
    }

    pub fn to_tick(&self, value: [i64; PHASE_LEN]) -> Result<i64, WeftError> {
        self.inner.to_tick(&value)
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
