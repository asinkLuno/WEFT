// 日本語グレゴリオ暦ローカライゼーション

const MONTHS = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];

fn metadata() {
    #{
        title: "グレゴリオ暦",
        description: "年・月・日・時・分・秒で時刻を表し、閏年規則を含みます。",
        units: ["年", "月", "日", "時", "分", "秒"],
        weekdays: ["月", "火", "水", "木", "金", "土", "日"]
    }
}

fn extra(values) {
    let names = ["月", "火", "水", "木", "金", "土", "日"];
    let n = weekday_number(values);
    let result = #{ weekday: names[n - 1], weekday_number: n };
    let y = values[0];
    let m = values[1];
    let d = values[2];
    if y >= 100 && m >= 1 && m <= 12 && d >= 1 && d <= 31 {
        let mothers_day = nth_weekday_of_month(y, 5, 7, 2);
        if m == 5 && d == mothers_day {
            result.holiday = "母の日";
        }
        let fathers_day = nth_weekday_of_month(y, 6, 7, 3);
        if m == 6 && d == fathers_day {
            result.holiday = "父の日";
        }
    }
    result
}

fn humanize(values) {
    let v = normalize(values);

    if v[0] == 0 && v[1] == 0 && v[2] == 0 && v[3] == 0 && v[4] == 0 && v[5] == 0 {
        return "0年0月0日";
    }

    // 絶対日付: year >= 100 かつ month が 1..12 → "YYYY年M月D日"
    if v[0] >= 100 && v[1] >= 1 && v[1] <= 12 && v[2] >= 1 && v[2] <= 31 {
        let date = `${v[0]}年${v[1]}月${v[2]}日`;
        if v[3] == 0 && v[4] == 0 && v[5] == 0 {
            return date;
        }
        let hh = if v[3] < 10 { `0${v[3]}` } else { `${v[3]}` };
        let mm = if v[4] < 10 { `0${v[4]}` } else { `${v[4]}` };
        let ss = if v[5] < 10 { `0${v[5]}` } else { `${v[5]}` };
        return `${date} ${hh}:${mm}:${ss}`;
    }

    // デュレーション/オフセット
    let units = ["年", "月", "日", "時", "分", "秒"];
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
