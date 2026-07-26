// WEFT Rhai material API v1 example.
fn material(ctx) {
    let date = ctx.moai.base_time.base_time;
    let month = date[1];
    let day = date[2];
    if (month == 1 && day >= 20) || (month == 2 && day <= 18) {
        "水瓶座"
    } else if (month == 2 && day >= 19) || (month == 3 && day <= 20) {
        "双鱼座"
    } else if (month == 3 && day >= 21) || (month == 4 && day <= 19) {
        "白羊座"
    } else if (month == 4 && day >= 20) || (month == 5 && day <= 20) {
        "金牛座"
    } else if (month == 5 && day >= 21) || (month == 6 && day <= 21) {
        "双子座"
    } else if (month == 6 && day >= 22) || (month == 7 && day <= 22) {
        "巨蟹座"
    } else if (month == 7 && day >= 23) || (month == 8 && day <= 22) {
        "狮子座"
    } else if (month == 8 && day >= 23) || (month == 9 && day <= 22) {
        "处女座"
    } else if (month == 9 && day >= 23) || (month == 10 && day <= 23) {
        "天秤座"
    } else if (month == 10 && day >= 24) || (month == 11 && day <= 22) {
        "天蝎座"
    } else if (month == 11 && day >= 23) || (month == 12 && day <= 21) {
        "射手座"
    } else {
        "摩羯座"
    }
}
