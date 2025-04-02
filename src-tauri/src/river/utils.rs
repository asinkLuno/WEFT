use super::{errors::RiverError, phase::Phase};

pub fn get_unit_chinese(
    time_vec: &mut [i32; Phase::MAX_LENGTH],
    unit_index: usize,
    extra_case: bool,
) -> Result<Option<([i32; 2], bool)>, RiverError> {
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
        _ => Err(RiverError::PhaseUnitIndexOutOfRange),
    }
}

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
