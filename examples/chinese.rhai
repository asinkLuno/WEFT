// Function to get Chinese calendar unit ranges
fn chinese(time_vec, unit_index, extra_case) {
    // 中国农历。简化计算，采用19年7闰
    switch unit_index {
        1 => {
            // 月份
            // 农历可能有闰月，一年可能有13个月
            // 检查是否是闰年（简化判断，实际应该查表）
            let year = time_vec[0];
            let leap_remainders = [0, 3, 6, 9, 11, 14, 17];
            if (year % 19) in leap_remainders {
                return [[1, 13], true];
            } else {
                return [[1, 12], true];
            }
        },
        2 => {
            // 日
            let month = time_vec[1];

            if month < 1 || month > 13 {
                if !extra_case {
                    return none; // 无法判断
                }
                return [[1, 30], false]; // 默认30天
            }

            // 判断大小月（简化版本）
            // 实际农历中，大小月的判断需要查表或复杂计算
            if month % 2 == 1 {
                return [[1, 30], true]; // 大月30天
            } else {
                return [[1, 29], true]; // 小月29天
            }
        },
        3 => return [[0, 24], false], // 时 (0-23)
        4 => return [[0, 60], false], // 分 (0-59)
        5 => return [[0, 60], false], // 秒 (0-59)
        _ => throw "PhaseUnitIndexOutOfRange"
    }
}
