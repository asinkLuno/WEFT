use rhai::{CustomType, TypeBuilder};
use serde::de::{Deserializer, Error as DeError};
use serde::{Deserialize, Serialize};
use serde_yaml::Value;

use super::aqueduct::{Aqueduct, PhasePlugin};
use super::errors::WeftError;
use super::utils::get_unit_gregorian;
const MAX_DEPTH: usize = 1000;

fn operate_vectors<F>(
    vec1: &[i32; Phase::MAX_LENGTH],
    vec2: &[i32; Phase::MAX_LENGTH],
    operation: F,
) -> [i32; Phase::MAX_LENGTH]
where
    F: Fn(i32, i32) -> i32,
{
    let mut result = [0; Phase::MAX_LENGTH];
    for i in 0..Phase::MAX_LENGTH {
        result[i] = operation(vec1[i], vec2[i]);
    }
    result
}

fn _handle_calendar_arithmetic(
    result: &mut [i32; Phase::MAX_LENGTH],
    unit_index: usize,
    extra_case: bool,
    depth: usize,
    date_mode: &str,
    aqueduct: Option<&Aqueduct>,
    vec1_ref: &mut [i32; Phase::MAX_LENGTH], // Pass original vec1 and vec2 for recursive calls
    vec2_ref: &mut [i32; Phase::MAX_LENGTH],
) -> Result<(), WeftError> {
    if depth > MAX_DEPTH {
        return Err(WeftError::MaximumRecursionDepthExceeded(MAX_DEPTH));
    }

    let unit_range_varlen: Option<([i32; 2], bool)>;
    if date_mode == "Gregorian" {
        unit_range_varlen = get_unit_gregorian(result, unit_index, extra_case)?;
    } else {
        if let Some(aq) = aqueduct {
            unit_range_varlen =
                aq.call_with::<PhasePlugin>(date_mode, (result.clone(), unit_index, extra_case))?;
        } else {
            return Err(WeftError::AqueductNotInitialized);
        }
    }

    match unit_range_varlen {
        Some((unit_range, if_varlen)) => {
            if result[unit_index] < unit_range[0] {
                if if_varlen {
                    //变长
                    result[unit_index] += unit_range[1];
                    result[unit_index - 1] -= 1;
                } else {
                    let deficit = unit_range[0] - result[unit_index];
                    let units_to_borrow = (deficit + unit_range[1] - 1) / unit_range[1];
                    result[unit_index] += units_to_borrow * unit_range[1];
                    result[unit_index - 1] -= units_to_borrow;
                }
                // Recursive call to handle further adjustments for the current unit
                _handle_calendar_arithmetic(result, unit_index, extra_case, depth + 1, date_mode, aqueduct, vec1_ref, vec2_ref)?;
            } else if result[unit_index] > unit_range[1] {
                if if_varlen {
                    result[unit_index] -= unit_range[1];
                    result[unit_index - 1] += 1;
                } else {
                    let excess = result[unit_index] - unit_range[1];
                    let units_to_carry = (excess + unit_range[1] - 1) / unit_range[1];
                    result[unit_index] -= units_to_carry * unit_range[1];
                    result[unit_index - 1] += units_to_carry;
                }
                 // Recursive call to handle further adjustments for the current unit
                _handle_calendar_arithmetic(result, unit_index, extra_case, depth + 1, date_mode, aqueduct, vec1_ref, vec2_ref)?;
            }
        }
        None => {
            //暂时不能提供的，先计算前面的
            // Process the previous unit first
            if unit_index > 0 {
                 add_time_vec(vec1_ref, vec2_ref, result, unit_index - 1, extra_case, depth + 1, date_mode, aqueduct)?;
            }
            // Then, retry the current unit with extra_case = true
            _handle_calendar_arithmetic(result, unit_index, true, depth + 1, date_mode, aqueduct, vec1_ref, vec2_ref)?;
        }
    }
    Ok(())
}

fn add_time_vec(
    vec1: &mut [i32; Phase::MAX_LENGTH],
    vec2: &mut [i32; Phase::MAX_LENGTH],
    result: &mut [i32; Phase::MAX_LENGTH],
    unit_index: usize,
    extra_case: bool,
    depth: usize,
    date_mode: &str,
    aqueduct: Option<&Aqueduct>,
) -> Result<(), WeftError> {
    if depth > MAX_DEPTH {
        return Err(WeftError::MaximumRecursionDepthExceeded(MAX_DEPTH));
    }

    result[unit_index] = vec1[unit_index] + vec2[unit_index] + result[unit_index];
    vec1[unit_index] = 0; // Clear after adding
    vec2[unit_index] = 0; // Clear after adding

    if unit_index > 0 {
        _handle_calendar_arithmetic(result, unit_index, extra_case, depth, date_mode, aqueduct, vec1, vec2)?; // Pass original vec1 and vec2

        // After handling the current unit, proceed to the previous unit if not an extra_case call
        if !extra_case {
            add_time_vec(vec1, vec2, result, unit_index - 1, false, depth + 1, date_mode, aqueduct)?;
        }
    }
    Ok(())
}

#[derive(Debug, Clone, CustomType)]
#[rhai_type(name = "PhaseNoRecusive")]
pub struct PhaseNoRecusive {
    base_time: [i32; Phase::MAX_LENGTH],
    ref_time: Option<[i32; Phase::MAX_LENGTH]>,
    base_time_name: Option<String>,
}

impl PhaseNoRecusive {
    pub fn absolute_time(&self) -> Result<[i32; Phase::MAX_LENGTH], WeftError> {
        match &self.ref_time {
            Some(ref_time) => Ok(operate_vectors(&self.base_time, ref_time, |a, b| a + b)),
            None => Ok(self.base_time.clone()),
        }
    }

    pub fn humanize(
        &self,
        date_mode: &str,
        aqueduct: Option<&Aqueduct>,
    ) -> Result<(Option<String>, [i32; Phase::MAX_LENGTH]), WeftError> {
        let mut vec1 = [0; Phase::MAX_LENGTH];
        let mut vec2;
        let mut result = [0; Phase::MAX_LENGTH];

        // Default calculator if none provided

        match (&self.base_time_name, &self.ref_time) {
            (Some(base_time_name), Some(ref_time)) => {
                vec2 = ref_time.clone();
                add_time_vec(
                    &mut vec1,
                    &mut vec2,
                    &mut result,
                    Phase::MAX_LENGTH - 1,
                    false,
                    0,
                    date_mode,
                    aqueduct,
                )?;
                Ok((Some(base_time_name.clone()), result))
            }
            (Some(_), None) => Err(WeftError::BaseTimeNameConflict),
            _ => {
                vec2 = self.absolute_time()?;
                add_time_vec(
                    &mut vec1,
                    &mut vec2,
                    &mut result,
                    Phase::MAX_LENGTH - 1,
                    false,
                    0,
                    date_mode,
                    aqueduct,
                )?;
                Ok((None, result))
            }
        }
    }
}
/// 时间相位的基本表示形式（递归结构）
#[derive(Debug, Clone)]
pub enum BaseTime {
    /// 直接的时间向量表示
    Vec([i32; Phase::MAX_LENGTH]),
    /// 嵌套的相位结构（使用Box避免无限大小）
    Phase(Box<Phase>),
}
/// 完整的相位结构，支持递归定义和时间计算
#[derive(Debug, Clone, CustomType)]
#[rhai_type(name = "Phase")]
pub struct Phase {
    base_time: BaseTime,
    ref_time: Option<[i32; Phase::MAX_LENGTH]>,
    base_time_name: Option<String>,
}

impl Phase {
    pub const MAX_LENGTH: usize = 6;

    fn check_vec(vec: &[i32; Phase::MAX_LENGTH]) -> Result<(), WeftError> {
        if vec[1..].iter().any(|&x| x < 0) {
            return Err(WeftError::SubYearPartMustBeNonnegative);
        }
        Ok(())
    }
    fn validate(
        base_time: &BaseTime,
        ref_time: &Option<[i32; Phase::MAX_LENGTH]>,
    ) -> Result<(), WeftError> {
        match base_time {
            BaseTime::Vec(vec) => {
                Phase::check_vec(vec)?;
            }
            BaseTime::Phase(phase) => {
                Phase::validate(&phase.base_time, &phase.ref_time)?;
            }
        }

        if let Some(rt) = ref_time {
            Phase::check_vec(rt)?;
        }

        Ok(())
    }

    fn _de_recusive(
        base_time: &mut BaseTime,
        ref_time: &mut Option<[i32; Phase::MAX_LENGTH]>,
        base_time_name: &mut Option<String>,
    ) -> Result<PhaseNoRecusive, WeftError> {
        match base_time {
            BaseTime::Vec(this_base_time) => Ok(PhaseNoRecusive {
                base_time: this_base_time.clone(),
                ref_time: ref_time.clone(),
                base_time_name: base_time_name.clone(),
            }),
            BaseTime::Phase(phase) => {
                if base_time_name.is_none() {
                    *base_time_name = phase.base_time_name.clone();
                } else if phase.base_time_name.is_some() {
                    return Err(WeftError::BaseTimeNameConflict);
                }

                if let Some(parent_ref_time) = &phase.ref_time {
                    let added_ref_time = if let Some(current_ref_time) = ref_time {
                        operate_vectors(parent_ref_time, current_ref_time, |a, b| a + b)
                    } else {
                        parent_ref_time.clone()
                    };
                    Phase::_de_recusive(
                        &mut phase.base_time,
                        &mut Some(added_ref_time),
                        base_time_name,
                    )
                } else {
                    Phase::_de_recusive(&mut phase.base_time, ref_time, base_time_name)
                }
            }
        }
    }
    pub fn de_recursive(&self) -> Result<PhaseNoRecusive, WeftError> {
        let mut base_time = self.base_time.clone();
        let mut ref_time = self.ref_time.clone();
        let mut base_time_name = self.base_time_name.clone();
        Phase::_de_recusive(&mut base_time, &mut ref_time, &mut base_time_name)
    }
    pub fn phase2iso8601(&self) -> Result<String, WeftError> {
        let mut abs_time = self.de_recursive()?.absolute_time()?; // Fixed method name
        let mut humanized_time = [0; Phase::MAX_LENGTH];
        let mut p2 = [0; Phase::MAX_LENGTH];
        add_time_vec(
            &mut abs_time,
            &mut p2,
            &mut humanized_time,
            Phase::MAX_LENGTH - 1,
            false,
            0,
            "Gregorian",
            None,
        )?;

        let year = if humanized_time[0] == 0 {
            1
        } else {
            humanized_time[0]
        };
        let month = if humanized_time[1] == 0 {
            1
        } else {
            humanized_time[1]
        };
        let day = if humanized_time[2] == 0 {
            1
        } else {
            humanized_time[2]
        };
        Ok(format!(
            "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}", // Added 'T' for ISO 8601
            year,
            month,
            day,
            humanized_time[3],
            humanized_time[4],
            humanized_time[5], // Removed .clone()
        ))
    }
}

impl<'de> Deserialize<'de> for Phase {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let value = Value::deserialize(deserializer)?;
        let mut seq = value
            .as_sequence()
            .ok_or_else(|| DeError::custom(format!("Expected sequence, got {:?}", value)))?
            .clone();

        let mut base_time: Option<BaseTime> = None;
        let mut ref_time: Option<[i32; Phase::MAX_LENGTH]> = None;
        let mut base_time_name: Option<String> = None;
        let mut ref_time_index = 0;

        while let Some(item) = seq.pop() {
            match item {
                Value::Sequence(inner) => {
                    if base_time.is_some() {
                        return Err(DeError::custom("Multiple base_time entries not allowed"));
                    }

                    // Try to parse as a nested Phase first
                    match serde_yaml::from_value::<Phase>(Value::Sequence(inner.clone())) {
                        Ok(phase) => {
                            base_time = Some(BaseTime::Phase(Box::new(phase)));
                        }
                        Err(err) => {
                            return Err(DeError::custom(format!("Failed to parse sequence as Phase or integer vector. Inner error: {}", err)));
                        }
                    }
                }
                Value::String(s) => {
                    if base_time_name.replace(s).is_some() {
                        return Err(DeError::custom("Multiple reference names are not allowed"));
                    }
                }
                Value::Number(n) => {
                    let number = n
                        .as_i64()
                        .and_then(|v| v.try_into().ok())
                        .ok_or_else(|| DeError::custom("Invalid number"))?;

                    let ref_time_array = ref_time.get_or_insert_with(Default::default);
                    if ref_time_index >= Phase::MAX_LENGTH {
                        return Err(DeError::custom(
                            "Reference time index exceeds maximum length",
                        ));
                    } else {
                        ref_time_array[ref_time_index] = number; // Corrected to use ref_time_array
                        ref_time_index += 1;
                    }
                }
                _ => return Err(DeError::custom("Unexpected value type")),
            }
        }

        if let Some(ref mut rt) = ref_time {
            rt[..ref_time_index].reverse();
        }

        match (base_time, ref_time, &base_time_name) {
            //FIXME:再检查一下这个条件是否完备
            (Some(bt), rt, btn) => {
                Phase::validate(&bt, &rt).map_err(DeError::custom)?;
                Ok(Phase {
                    base_time: bt,
                    ref_time: rt,
                    base_time_name: btn.clone(),
                })
            }
            (None, Some(rt), None) => {
                let bt = BaseTime::Vec(rt);
                Phase::validate(&bt, &None).map_err(DeError::custom)?;
                Ok(Phase {
                    base_time: bt,
                    ref_time: None,
                    base_time_name: None,
                })
            }
            (None, _, _) => Err(DeError::custom("Must contain a base_time field")),
        }
    }
}

impl Serialize for Phase {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        use serde::ser::SerializeStruct;

        // Get the flattened representation
        let phase_no_recusive = self.de_recursive().map_err(serde::ser::Error::custom)?;
        let (base_time_name, absolute_time) = phase_no_recusive
            .humanize("Gregorian", None)
            .map_err(serde::ser::Error::custom)?;

        // Create a struct with 1 or 2 fields depending on whether base_time_name exists
        let mut state =
            serializer.serialize_struct("Phase", if base_time_name.is_some() { 2 } else { 1 })?;

        // Only serialize base_time_name if it exists
        if let Some(name) = base_time_name {
            state.serialize_field("base_time_name", &name)?;
        }

        state.serialize_field("absolute_time", &absolute_time)?;
        state.end()
    }
}

pub fn sub_phase(
    p1: &Phase,
    p2: &Phase,
    date_mode: &str,
    aqueduct: Option<&Aqueduct>,
) -> Result<[i32; Phase::MAX_LENGTH], WeftError> {
    let p1_de_recusive = p1.de_recursive()?;
    let p2_de_recusive = p2.de_recursive()?;
    let mut result = [0; Phase::MAX_LENGTH];
    let mut vec1;
    let mut vec2;

    //base_time一致
    if p1_de_recusive.base_time == p2_de_recusive.base_time {
        vec1 = p1_de_recusive.ref_time.unwrap_or_default();
        vec2 = p2_de_recusive.ref_time.map_or_else(Default::default, |mut rt| {
            rt.iter_mut().for_each(|x| *x = -*x);
            rt
        });
    } else {
        let p1_absolute_time = p1_de_recusive.absolute_time()?;
        let p2_absolute_time = p2_de_recusive.absolute_time()?;
        vec1 = p1_absolute_time.clone();
        vec2 = p2_absolute_time.clone();
        vec2[..Phase::MAX_LENGTH].iter_mut().for_each(|x| *x = -*x);
    }

    add_time_vec(
        &mut vec1,
        &mut vec2,
        &mut result,
        Phase::MAX_LENGTH - 1,
        false,
        0,
        date_mode,
        aqueduct,
    )?;
    Ok(result)
}
