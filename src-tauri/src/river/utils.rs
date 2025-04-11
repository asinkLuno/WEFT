use super::{errors::RiverError, phase::Phase};

pub fn get_unit_gregorian(
    time_vec: &mut [i32; Phase::MAX_LENGTH],
    unit_index: usize,
    extra_case: bool,
) -> Result<Option<([i32; 2], bool)>, RiverError> {
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
        _ => Err(RiverError::PhaseUnitIndexOutOfRange),
    }
}
