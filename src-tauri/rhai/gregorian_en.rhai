// English Gregorian localization

fn metadata() {
    #{
        title: "Gregorian Calendar",
        description: "Represents time with years, months, days, hours, minutes, and seconds.",
        units: ["year", "month", "day", "hour", "minute", "second"]
    }
}

const MONTHS = ["Jan.", "Feb.", "Mar.", "Apr.", "May", "Jun.", "Jul.", "Aug.", "Sep.", "Oct.", "Nov.", "Dec."];

fn humanize(values) {
    let v = normalize(values);

    if v[0] == 0 && v[1] == 0 && v[2] == 0 && v[3] == 0 && v[4] == 0 && v[5] == 0 {
        return "0 years, 0 months, 0 days";
    }

    // Absolute date: year >= 100 and month in 1..12 → "Mon DD, YYYY"
    if v[0] >= 100 && v[1] >= 1 && v[1] <= 12 && v[2] >= 1 && v[2] <= 31 {
        let date = `${MONTHS[v[1] - 1]} ${v[2]}, ${v[0]}`;
        if v[3] == 0 && v[4] == 0 && v[5] == 0 {
            return date;
        }
        let hh = if v[3] < 10 { `0${v[3]}` } else { `${v[3]}` };
        let mm = if v[4] < 10 { `0${v[4]}` } else { `${v[4]}` };
        let ss = if v[5] < 10 { `0${v[5]}` } else { `${v[5]}` };
        return `${date}, ${hh}:${mm}:${ss}`;
    }

    // Duration / offset → "X years, Y months, Z days"
    let units = ["year", "month", "day", "hour", "minute", "second"];
    let parts = [];
    for i in 0..6 {
        if v[i] != 0 {
            if v[i] == 1 {
                parts.push(`${v[i]} ${units[i]}`);
            } else {
                parts.push(`${v[i]} ${units[i]}s`);
            }
        }
    }
    let out = "";
    for i in 0..parts.len() {
        if i > 0 {
            out += ", ";
        }
        out += parts[i];
    }
    out
}
