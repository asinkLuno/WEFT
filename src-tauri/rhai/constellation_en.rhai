// English constellation material

fn constellation(context) {
    if !context.date_mode.starts_with("gregorian") {
        throw `constellation requires Gregorian calendar, got ${context.date_mode}`;
    }
    let base = context.moai.base_time.base_time;
    let month = base[1];
    let day = base[2];
    if month == 1 {
        if day >= 20 { "Aquarius" } else { "Capricorn" }
    } else if month == 2 {
        if day >= 19 { "Pisces" } else { "Aquarius" }
    } else if month == 3 {
        if day >= 21 { "Aries" } else { "Pisces" }
    } else if month == 4 {
        if day >= 20 { "Taurus" } else { "Aries" }
    } else if month == 5 {
        if day >= 21 { "Gemini" } else { "Taurus" }
    } else if month == 6 {
        if day >= 22 { "Cancer" } else { "Gemini" }
    } else if month == 7 {
        if day >= 23 { "Leo" } else { "Cancer" }
    } else if month == 8 {
        if day >= 23 { "Virgo" } else { "Leo" }
    } else if month == 9 {
        if day >= 23 { "Libra" } else { "Virgo" }
    } else if month == 10 {
        if day >= 24 { "Scorpio" } else { "Libra" }
    } else if month == 11 {
        if day >= 23 { "Sagittarius" } else { "Scorpio" }
    } else {
        if day >= 22 { "Capricorn" } else { "Sagittarius" }
    }
}
