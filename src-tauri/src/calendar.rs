use crate::{
    error::WeftError,
    phase::PHASE_LEN,
    plugin::{calendar_source, RhaiCalendar},
};
use serde::Serialize;
use serde_yaml::Mapping;
use std::path::Path;

#[derive(Debug, Clone, Serialize)]
pub struct CalendarMetadata {
    pub name: String,
    pub title: String,
    pub description: String,
    pub units: Vec<String>,
    pub source: String,
}

fn builtin_metadata(name: &str) -> Result<CalendarMetadata, WeftError> {
    match name {
        "gregorian" | "gregorian_en" => Ok(CalendarMetadata {
            name: name.into(),
            title: if name == "gregorian_en" {
                "Gregorian Calendar".into()
            } else {
                "格里高利历".into()
            },
            description: if name == "gregorian_en" {
                "Represents time with years, months, days, hours, minutes, and seconds.".into()
            } else {
                "采用年、月、日和时分秒表示时间，并包含公历闰年规则。".into()
            },
            units: ["年", "月", "日", "时", "分", "秒"]
                .into_iter()
                .map(str::to_owned)
                .collect(),
            source: "builtin".into(),
        }),
        other => Err(WeftError::Schema(format!("不支持的 date_mode: {other:?}"))),
    }
}

#[derive(Debug)]
pub enum Calendar {
    Builtin { english: bool },
    Rhai(Box<RhaiCalendar>),
}

impl Calendar {
    pub fn load(name: &str, spec: Option<&Mapping>, base: &Path) -> Result<Self, WeftError> {
        match name {
            "gregorian" => Ok(Self::Builtin { english: false }),
            "gregorian_en" => Ok(Self::Builtin { english: true }),
            other => {
                let source = calendar_source(spec, other)?;
                Ok(Self::Rhai(Box::new(RhaiCalendar::load(
                    other,
                    &base.join(source),
                )?)))
            }
        }
    }

    pub fn metadata(&self, name: &str) -> Result<CalendarMetadata, WeftError> {
        match self {
            Self::Builtin { .. } => builtin_metadata(name),
            Self::Rhai(calendar) => {
                let value = calendar.metadata()?;
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
        }
    }

    pub fn normalize(&self, value: [i64; PHASE_LEN]) -> Result<[i64; PHASE_LEN], WeftError> {
        match self {
            Self::Builtin { .. } => Ok(normalize(value)),
            Self::Rhai(calendar) => {
                let normalized = calendar.normalize(&value)?;
                normalized
                    .try_into()
                    .map_err(|_| WeftError::Plugin("normalize 必须返回六个时间分量".into()))
            }
        }
    }

    pub fn humanize(&self, value: [i64; PHASE_LEN]) -> Result<String, WeftError> {
        match self {
            Self::Builtin { english } => Ok(humanize(value, *english)),
            Self::Rhai(calendar) => calendar.humanize(&value),
        }
    }

    pub fn to_tick(&self, value: [i64; PHASE_LEN]) -> Result<i64, WeftError> {
        match self {
            Self::Builtin { .. } => Ok(to_tick(value)),
            Self::Rhai(calendar) => calendar.to_tick(&value),
        }
    }
}

pub fn normalize(mut value: [i64; PHASE_LEN]) -> [i64; PHASE_LEN] {
    for index in (1..PHASE_LEN).rev() {
        let limit = match index {
            1 => 12,
            2 => days_in_month(value[0], value[1]),
            3 => 24,
            4 | 5 => 60,
            _ => unreachable!(),
        };
        if limit > 0 && (value[index] > limit || value[index] < 0) {
            let carry = value[index].div_euclid(limit);
            value[index] = value[index].rem_euclid(limit);
            value[index - 1] += carry;
        }
    }
    value
}

pub fn humanize(value: [i64; PHASE_LEN], english: bool) -> String {
    let value = normalize(value);
    if english {
        let names = [
            ("year", "years"),
            ("month", "months"),
            ("day", "days"),
            ("hour", "hours"),
            ("minute", "minutes"),
            ("second", "seconds"),
        ];
        let parts: Vec<_> = value
            .into_iter()
            .zip(names)
            .filter(|(v, _)| *v != 0)
            .map(|(v, (one, many))| format!("{v} {}", if v.abs() == 1 { one } else { many }))
            .collect();
        return if parts.is_empty() {
            "0 years, 0 months, 0 days".into()
        } else {
            parts.join(", ")
        };
    }
    if value.iter().all(|v| *v == 0) {
        return "0年0月0日".into();
    }
    value
        .into_iter()
        .zip(["年", "月", "日", "时", "分", "秒"])
        .filter(|(v, _)| *v != 0)
        .map(|(v, unit)| format!("{v}{unit}"))
        .collect()
}

pub fn to_tick(value: [i64; PHASE_LEN]) -> i64 {
    let [mut year, month, day, hour, minute, second] = value;
    let (year_carry, month_index) = (month - 1).div_mod_floor(12);
    year += year_carry;
    let month = month_index.rem_euclid(12) + 1;
    let (day_carry, seconds) = (hour * 3600 + minute * 60 + second).div_mod_floor(86400);
    let adjusted_year = year - i64::from(month <= 2);
    let era = adjusted_year.div_euclid(400);
    let yoe = adjusted_year - era * 400;
    let shifted_month = month + if month > 2 { -3 } else { 9 };
    let doy = (153 * shifted_month + 2) / 5;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    (era * 146097 + doe + day - 1 + day_carry) * 86400 + seconds
}

trait DivModFloor {
    fn div_mod_floor(self, rhs: Self) -> (Self, Self)
    where
        Self: Sized;
}
impl DivModFloor for i64 {
    fn div_mod_floor(self, rhs: Self) -> (Self, Self) {
        (self.div_euclid(rhs), self.rem_euclid(rhs))
    }
}

fn days_in_month(year: i64, month: i64) -> i64 {
    match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 if (year % 4 == 0 && year % 100 != 0) || year % 400 == 0 => 29,
        2 => 28,
        _ => 31,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn leap_year_and_tick_distance() {
        let a = to_tick([2024, 2, 28, 0, 0, 0]);
        let b = to_tick([2024, 3, 1, 0, 0, 0]);
        assert_eq!(b - a, 2 * 86400);
    }
}
