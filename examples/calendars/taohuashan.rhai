// 《桃花扇》剧情历法（WEFT Rhai calendar API v1）。
//
// 仅覆盖剧情及其归一化边界所需的 1642—1646 农历年。月份数据依据
// 历史中西历对照资料整理；1642 年闰九月，1645 年闰六月。
//
// 第二分量是“月序”而不是传统月名：平年为 1—12；闰年为 1—13。
// 例如 1645 年的第 7 月是闰六月，第 8 月才是七月。这样相对时间
// [0, 1, 0, anchor] 才能稳定表示“下一个朔望月”。

fn metadata() {
    #{
        title: "《桃花扇》剧情历法",
        description: "用于崇祯末年至南明弘光年间剧情的历史农历表；第二分量按当年月序编码，仅支持1642—1646年。",
        components: 6
    }
}

fn leap_month(year) {
    if year == 1642 {
        9
    } else if year == 1645 {
        6
    } else {
        0
    }
}

fn month_lengths(year) {
    if year == 1642 {
        [30, 29, 30, 29, 30, 30, 29, 30, 30, 29, 30, 29, 29]
    } else if year == 1643 {
        [30, 29, 30, 29, 30, 29, 30, 30, 29, 30, 30, 29]
    } else if year == 1644 {
        [30, 29, 29, 30, 29, 29, 30, 30, 29, 30, 30, 30]
    } else if year == 1645 {
        [29, 30, 29, 29, 30, 29, 29, 30, 29, 30, 30, 30, 30]
    } else if year == 1646 {
        [29, 30, 29, 29, 30, 29, 29, 30, 29, 30, 30, 30]
    } else {
        throw `《桃花扇》剧情历法不支持 ${year} 年`;
    }
}

fn floor_div(value, divisor) {
    if value >= 0 {
        value / divisor
    } else {
        (value - divisor + 1) / divisor
    }
}

fn normalize(values) {
    let result = values;

    let total_seconds = result[3] * 3600 + result[4] * 60 + result[5];
    let day_carry = floor_div(total_seconds, 86400);
    let seconds = total_seconds - day_carry * 86400;
    result[2] += day_carry;
    result[3] = seconds / 3600;
    result[4] = (seconds % 3600) / 60;
    result[5] = seconds % 60;

    while result[1] <= 0 {
        result[0] -= 1;
        result[1] += month_lengths(result[0]).len;
    }
    while result[1] > month_lengths(result[0]).len {
        result[1] -= month_lengths(result[0]).len;
        result[0] += 1;
    }

    while result[2] <= 0 {
        result[1] -= 1;
        if result[1] <= 0 {
            result[0] -= 1;
            result[1] = month_lengths(result[0]).len;
        }
        result[2] += month_lengths(result[0])[result[1] - 1];
    }
    while result[2] > month_lengths(result[0])[result[1] - 1] {
        result[2] -= month_lengths(result[0])[result[1] - 1];
        result[1] += 1;
        if result[1] > month_lengths(result[0]).len {
            result[0] += 1;
            result[1] = 1;
        }
    }

    // Force a range check after a possible carry into the next year.
    month_lengths(result[0]);
    result
}

fn to_tick(values) {
    let value = normalize(values);
    let days = 0;
    let year = 1642;
    while year < value[0] {
        for length in month_lengths(year) {
            days += length;
        }
        year += 1;
    }
    let slot = 1;
    while slot < value[1] {
        days += month_lengths(value[0])[slot - 1];
        slot += 1;
    }
    days += value[2] - 1;
    days * 86400 + value[3] * 3600 + value[4] * 60 + value[5]
}

fn year_name(year) {
    if year == 1642 {
        "崇祯十五年（壬午）"
    } else if year == 1643 {
        "崇祯十六年（癸未）"
    } else if year == 1644 {
        "崇祯十七年（甲申）"
    } else if year == 1645 {
        "弘光元年（乙酉）"
    } else {
        `隆武二年（丙戌，${year}年）`
    }
}

fn month_name(year, slot) {
    let names = [
        "正月", "二月", "三月", "四月", "五月", "六月",
        "七月", "八月", "九月", "十月", "冬月", "腊月"
    ];
    let leap = leap_month(year);
    if leap > 0 && slot == leap + 1 {
        `闰${names[leap - 1]}`
    } else {
        let traditional = if leap > 0 && slot > leap + 1 { slot - 1 } else { slot };
        names[traditional - 1]
    }
}

fn day_name(day) {
    let names = [
        "初一", "初二", "初三", "初四", "初五", "初六", "初七", "初八", "初九", "初十",
        "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十",
        "廿一", "廿二", "廿三", "廿四", "廿五", "廿六", "廿七", "廿八", "廿九", "三十"
    ];
    names[day - 1]
}

fn humanize(values) {
    let value = normalize(values);
    let clock = if value[3] == 0 && value[4] == 0 && value[5] == 0 {
        ""
    } else {
        ` ${value[3].to_string().pad(2, '0')}:${value[4].to_string().pad(2, '0')}:${value[5].to_string().pad(2, '0')}`
    };
    `${year_name(value[0])}${month_name(value[0], value[1])}${day_name(value[2])}${clock}`
}
