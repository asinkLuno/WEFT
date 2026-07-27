// 《黑暗的左手》卡尔海德历法（WEFT Rhai calendar API v1）。

fn metadata() {
    #{
        title: "卡尔海德历法",
        description: "格辛星卡尔海德使用的历法，以永远作为“元年”的相对年份、十四个月、二十六日和十个时辰组织时间。",
        components: 4
    }
}

fn normalize(values) {
    let result = values;
    if result[3] > 10 || result[3] < 0 {
        result[2] += result[3] / 10;
        result[3] %= 10;
    }
    if result[2] > 26 || result[2] < 0 {
        result[1] += result[2] / 26;
        result[2] %= 26;
    }
    if result[1] > 14 || result[1] < 0 {
        result[0] += result[1] / 14;
        result[1] %= 14;
    }
    result
}

fn to_tick(values) {
    (((values[0] * 14 + values[1] - 1) * 26 + values[2] - 1) * 10) + values[3]
}

fn humanize(values) {
    let months = [
        "瑟恩", "萨瑟恩", "尼默", "安纳", "伊勒姆", "莫斯", "图瓦",
        "奥斯默", "奥克尔", "库斯", "哈坎纳", "戈尔", "苏斯米", "格伦德"
    ];
    let days = [
        "格辛尼", "索德尼", "埃普斯", "阿尔哈德", "奈瑟哈德", "斯特雷斯",
        "伯尼", "奥尼", "哈尔哈哈德", "盖尔尼", "厄尔尼", "波斯特",
        "托门博德", "奥德格辛尼", "奥德索德尼", "奥德埃普斯", "奥德阿尔哈德",
        "奥奈瑟哈德", "奥德斯特雷斯", "奥德伯尼", "奥德奥尼",
        "奥德哈尔哈哈德", "奥德盖尔尼", "奥德厄尔尼", "奥德波斯特", "奥托门博德"
    ];
    let year = values[0];
    let month = values[1];
    let day = values[2];
    let hour = values[3];
    if year == 0 && month == 0 && day == 0 && hour == 0 {
        return "0年0月0日";
    }
    if month >= 1 && month <= 14 && day >= 1 && day <= 26 {
        let year_name = if year == 1 {
            "元年"
        } else if year < 1 {
            `${1 - year}年前`
        } else {
            `${year - 1}年后`
        };
        let clock = if hour == 0 { "" } else { `，第${hour}时` };
        return `${year_name}·${days[day - 1]}·${months[month - 1]}${clock}`;
    }
    `${year}年、${month}月、${day}日、${hour}时`
}
