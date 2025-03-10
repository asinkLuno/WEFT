use serde::de::{Deserializer, Error as DeError};
use serde::{Deserialize, Serialize};
use serde_yaml::Value;

use super::dao::DateMode;

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

fn get_unit_chinese(
    time_vec: &mut [i32; Phase::MAX_LENGTH],
    unit_index: usize,
    extra_case: bool,
) -> Result<Option<([i32; 2], bool)>, String> {
    // 中国农历。简化计算，采用19年7闰
    match unit_index {
        1 => {
            // 月份
            // 农历可能有闰月，一年可能有13个月
            // 检查是否是闰年（简化判断，实际应该查表）
            let year = time_vec[0];
            if year % 19 == 0
                || year % 19 == 3
                || year % 19 == 6
                || year % 19 == 9
                || year % 19 == 11
                || year % 19 == 14
                || year % 19 == 17
            {
                Ok(Some(([1, 13], true))) // 闰年有13个月
            } else {
                Ok(Some(([1, 12], true))) // 平年有12个月
            }
        }
        2 => {
            // 日
            let month = time_vec[1];

            if month < 1 || month > 13 {
                if !extra_case {
                    return Ok(None); // 无法判断
                }
                return Ok(Some(([1, 30], false))); // 默认30天
            }

            // 判断大小月（简化版本）
            // 实际农历中，大小月的判断需要查表或复杂计算
            if month % 2 == 1 {
                Ok(Some(([1, 30], true))) // 大月30天
            } else {
                Ok(Some(([1, 29], true))) // 小月29天
            }
        }
        3 => Ok(Some(([0, 24], false))), // 时 (0-23)
        4 => Ok(Some(([0, 60], false))), // 分 (0-59)
        5 => Ok(Some(([0, 60], false))), // 秒 (0-59)
        _ => Err("Unit index out of range".into()),
    }
}

fn get_unit_gregorian(
    time_vec: &mut [i32; Phase::MAX_LENGTH],
    unit_index: usize,
    extra_case: bool,
) -> Result<Option<([i32; 2], bool)>, String> {
    match unit_index {
        1 => Ok(Some(([0, 12], false))), //月
        2 => {
            //日
            let month = time_vec[1];
            let year = time_vec[0];

            if month < 1 || month > 12 {
                if !extra_case {
                    return Ok(None); //无法判断，需要根据年份判断
                }
                return Ok(Some(([0, 30], false))); //已经计算过前向的数据了，缺失返回30
            }

            match month {
                2 => {
                    if (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0) {
                        Ok(Some(([0, 29], false)))
                    } else {
                        Ok(Some(([0, 28], false)))
                    }
                }
                4 | 6 | 9 | 11 => Ok(Some(([0, 30], false))),
                _ => Ok(Some(([0, 31], true))),
            }
        }
        3 => Ok(Some(([0, 24], false))),
        4 => Ok(Some(([0, 60], false))),
        5 => Ok(Some(([0, 60], false))),
        _ => Err("Unit index out of range".into()),
    }
}

fn add_time_vec<F>(
    vec1: &mut [i32; Phase::MAX_LENGTH],
    vec2: &mut [i32; Phase::MAX_LENGTH],
    result: &mut [i32; Phase::MAX_LENGTH],
    unit_index: usize,
    extra_case: bool,
    depth: usize,
    operation: &F,
) -> Result<(), String>
where
    F: Fn(&mut [i32; Phase::MAX_LENGTH], usize, bool) -> Result<Option<([i32; 2], bool)>, String>,
{
    // Check if we've exceeded the maximum recursion depth
    if depth > MAX_DEPTH {
        return Err(format!("Maximum recursion depth ({}) exceeded", MAX_DEPTH));
    }
    result[unit_index] = vec1[unit_index] + vec2[unit_index] + result[unit_index];
    vec1[unit_index] = 0;
    vec2[unit_index] = 0;
    if unit_index > 0 {
        let unit_range_varlen = operation(result, unit_index, extra_case)?;
        match unit_range_varlen {
            Some((unit_range, if_varlen)) => {
                if result[unit_index] < unit_range[0] {
                    if if_varlen {
                        //变长
                        result[unit_index] += unit_range[1];
                        result[unit_index - 1] -= 1;
                    } else {
                        // while result[unit_index] < unit_range[0] {
                        //     result[unit_index] += unit_range[1];
                        //     result[unit_index - 1] -= 1;
                        // }

                        let deficit = unit_range[0] - result[unit_index];
                        let units_to_borrow = (deficit + unit_range[1] - 1) / unit_range[1];
                        result[unit_index] += units_to_borrow * unit_range[1];
                        result[unit_index - 1] -= units_to_borrow;
                    }
                    add_time_vec(
                        vec1,
                        vec2,
                        result,
                        unit_index,
                        extra_case,
                        depth + 1,
                        operation,
                    )?;
                } else if result[unit_index] > unit_range[1] {
                    if if_varlen {
                        result[unit_index] -= unit_range[1];
                        result[unit_index - 1] += 1;
                    } else {
                        // while result[unit_index] > unit_range[1] {
                        //     result[unit_index] -= unit_range[1];
                        //     result[unit_index - 1] += 1;
                        // }

                        let excess = result[unit_index] - unit_range[1];
                        let units_to_carry = (excess + unit_range[1] - 1) / unit_range[1];
                        result[unit_index] -= units_to_carry * unit_range[1];
                        result[unit_index - 1] += units_to_carry;
                    }
                    add_time_vec(
                        vec1,
                        vec2,
                        result,
                        unit_index,
                        extra_case,
                        depth + 1,
                        operation,
                    )?;
                }
            }
            None => {
                //暂时不能提供的，先计算前面的
                add_time_vec(
                    vec1,
                    vec2,
                    result,
                    unit_index - 1,
                    extra_case,
                    depth + 1,
                    operation,
                )?;
                add_time_vec(vec1, vec2, result, unit_index, true, depth + 1, operation)?;
                return Ok(());
            }
        }
        if !extra_case {
            add_time_vec(
                vec1,
                vec2,
                result,
                unit_index - 1,
                extra_case,
                depth + 1,
                operation,
            )?;
        }
    }
    Ok(())
}

// New function to get the appropriate date calculation function based on DateMode
pub fn get_date_calculator(
    date_mode: Option<&DateMode>,
) -> impl Fn(&mut [i32; Phase::MAX_LENGTH], usize, bool) -> Result<Option<([i32; 2], bool)>, String>
{
    match date_mode {
        Some(DateMode::Chinese) => get_unit_chinese,
        _ => get_unit_gregorian, // Default to Gregorian for None or explicitly Gregorian
    }
}

#[derive(Debug, Clone)]
pub struct PhaseNoRecusive {
    base_time: [i32; Phase::MAX_LENGTH],
    ref_time: Option<[i32; Phase::MAX_LENGTH]>,
    base_time_name: Option<String>,
}

impl PhaseNoRecusive {
    pub fn absolute_time(&self) -> Result<[i32; Phase::MAX_LENGTH], String> {
        match &self.ref_time {
            Some(ref_time) => Ok(operate_vectors(&self.base_time, ref_time, |a, b| a + b)),
            None => Ok(self.base_time.clone()),
        }
    }

    pub fn humanize(
        &self,
        date_mode: Option<&DateMode>,
    ) -> Result<(Option<String>, [i32; Phase::MAX_LENGTH]), String> {
        let mut vec1 = [0; Phase::MAX_LENGTH];
        let mut vec2;
        let mut result = [0; Phase::MAX_LENGTH];
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
                    &get_date_calculator(date_mode),
                )?;
                Ok((Some(base_time_name.clone()), result))
            }
            (Some(_), None) => Err(format!("base_time_name is not allowed without ref_time")),
            _ => {
                vec2 = self.absolute_time()?;
                add_time_vec(
                    &mut vec1,
                    &mut vec2,
                    &mut result,
                    Phase::MAX_LENGTH - 1,
                    false,
                    0,
                    &get_date_calculator(date_mode),
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
#[derive(Debug, Clone)]
pub struct Phase {
    base_time: BaseTime,
    ref_time: Option<[i32; Phase::MAX_LENGTH]>,
    base_time_name: Option<String>,
}

impl Phase {
    pub const MAX_LENGTH: usize = 6;

    fn check_vec(vec: &[i32; Phase::MAX_LENGTH]) -> Result<(), String> {
        if vec[1..].iter().any(|&x| x < 0) {
            return Err("sub_year_part must be nonnegative".into());
        }
        Ok(())
    }
    fn validate(
        base_time: &BaseTime,
        ref_time: &Option<[i32; Phase::MAX_LENGTH]>,
    ) -> Result<(), String> {
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
    ) -> Result<PhaseNoRecusive, String> {
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
                    return Err("base_time_name conflict detected".into());
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
    /// 公开接口：将相位转换为非递归表示
    pub fn de_recursive(&self) -> Result<PhaseNoRecusive, String> {
        let mut base_time = self.base_time.clone();
        let mut ref_time = self.ref_time.clone();
        let mut base_time_name = self.base_time_name.clone();
        Phase::_de_recusive(&mut base_time, &mut ref_time, &mut base_time_name)
    }
    pub fn phase2iso8601(&self) -> Result<String, String> {
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
            &get_unit_gregorian,
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

                    if ref_time.is_none() {
                        ref_time = Some([0; Phase::MAX_LENGTH]); // Initialize the array
                    }

                    let ref_time_array = ref_time.as_mut().unwrap();
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
            .humanize(None)
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
    date_mode: Option<&DateMode>,
) -> Result<[i32; Phase::MAX_LENGTH], String> {
    let p1_de_recusive = p1.de_recursive()?;
    let p2_de_recusive = p2.de_recursive()?;
    let mut result = [0; Phase::MAX_LENGTH];
    let mut vec1;
    let mut vec2;

    //base_time一致
    if p1_de_recusive.base_time == p2_de_recusive.base_time {
        if let Some(ref_time) = p1_de_recusive.ref_time {
            vec1 = ref_time.clone();
        } else {
            vec1 = [0; Phase::MAX_LENGTH];
        }
        if let Some(ref_time) = p2_de_recusive.ref_time {
            vec2 = ref_time.clone();
            vec2[..Phase::MAX_LENGTH].iter_mut().for_each(|x| *x = -*x);
        } else {
            vec2 = [0; Phase::MAX_LENGTH];
        }
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
        &get_date_calculator(date_mode),
    )?;
    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn test_sub_phase() -> Result<(), String> {
        let mut v1 = [2024, 2, 30, 0, 0, 0];
        let mut v2 = [0, 0, 1, 0, 0, 0];
        let mut result = [0; Phase::MAX_LENGTH];
        add_time_vec(
            &mut v1,
            &mut v2,
            &mut result,
            Phase::MAX_LENGTH - 1,
            false,
            0,
            &get_date_calculator(None),
        )?;
        println!("v3: {:?}", result);
        Ok(())
    }
}
