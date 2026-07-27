// 中文格里高利历本地化

fn metadata() {
    #{
        title: "格里高利历",
        description: "采用年、月、日和时分秒表示时间，并包含公历闰年规则。",
        units: ["年", "月", "日", "时", "分", "秒"]
    }
}

fn humanize(values) {
    let units = ["年", "月", "日", "时", "分", "秒"];
    let v = normalize(values);
    if v[0] == 0 && v[1] == 0 && v[2] == 0 && v[3] == 0 && v[4] == 0 && v[5] == 0 {
        return `0${units[0]}0${units[1]}0${units[2]}`;
    }
    let parts = [];
    for i in 0..6 {
        if v[i] != 0 {
            parts.push(`${v[i]}${units[i]}`);
        }
    }
    let out = "";
    for i in 0..parts.len() {
        out += parts[i];
    }
    out
}
