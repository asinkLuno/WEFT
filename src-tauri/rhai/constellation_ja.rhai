// 日本語星座素材

fn constellation(context) {
    if !context.date_mode.starts_with("gregorian") {
        throw `constellation requires Gregorian calendar, got ${context.date_mode}`;
    }
    let base = context.moai.base_time.base_time;
    let month = base[1];
    let day = base[2];
    if month == 1 {
        if day >= 20 { "水瓶座" } else { "磨羯座" }
    } else if month == 2 {
        if day >= 19 { "魚座" } else { "水瓶座" }
    } else if month == 3 {
        if day >= 21 { "牡羊座" } else { "魚座" }
    } else if month == 4 {
        if day >= 20 { "牡牛座" } else { "牡羊座" }
    } else if month == 5 {
        if day >= 21 { "双子座" } else { "牡牛座" }
    } else if month == 6 {
        if day >= 22 { "蟹座" } else { "双子座" }
    } else if month == 7 {
        if day >= 23 { "獅子座" } else { "蟹座" }
    } else if month == 8 {
        if day >= 23 { "乙女座" } else { "獅子座" }
    } else if month == 9 {
        if day >= 23 { "天秤座" } else { "乙女座" }
    } else if month == 10 {
        if day >= 24 { "蠍座" } else { "天秤座" }
    } else if month == 11 {
        if day >= 23 { "射手座" } else { "蠍座" }
    } else {
        if day >= 22 { "磨羯座" } else { "射手座" }
    }
}
