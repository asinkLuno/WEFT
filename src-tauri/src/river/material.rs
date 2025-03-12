use crate::river::dao::Moai;
use crate::river::errors::RiverError;
use serde::{Deserialize, Serialize};
use strum_macros::EnumString;

#[derive(Deserialize, Serialize, Debug, Clone, EnumString, strum_macros::Display)]
pub enum Constellation {
    #[strum(serialize = "摩羯座")]
    Capricorn,
    #[strum(serialize = "水瓶座")]
    Aquarius,
    #[strum(serialize = "双鱼座")]
    Pisces,
    #[strum(serialize = "白羊座")]
    Aries,
    #[strum(serialize = "金牛座")]
    Taurus,
    #[strum(serialize = "双子座")]
    Gemini,
    #[strum(serialize = "巨蟹座")]
    Cancer,
    #[strum(serialize = "狮子座")]
    Leo,
    #[strum(serialize = "处女座")]
    Virgo,
    #[strum(serialize = "天秤座")]
    Libra,
    #[strum(serialize = "天蝎座")]
    Scorpio,
    #[strum(serialize = "射手座")]
    Sagittarius,
}

pub fn get_constellation(moai: &Moai) -> Result<Option<Constellation>, RiverError> {
    let base_time = moai.base_time();
    match base_time {
        Some(base_time) => {
            let absolute_time = base_time.de_recursive()?.absolute_time()?;
            let month = absolute_time[1];
            let day = absolute_time[2];
            if month == 0 || day == 0 {
                return Ok(None);
            }

            Ok(match month {
                1 => Some(if day < 20 {
                    Constellation::Capricorn
                } else {
                    Constellation::Aquarius
                }),
                2 => Some(if day < 19 {
                    Constellation::Aquarius
                } else {
                    Constellation::Pisces
                }),
                3 => Some(if day < 21 {
                    Constellation::Pisces
                } else {
                    Constellation::Aries
                }),
                4 => Some(if day < 20 {
                    Constellation::Aries
                } else {
                    Constellation::Taurus
                }),
                5 => Some(if day < 21 {
                    Constellation::Taurus
                } else {
                    Constellation::Gemini
                }),
                6 => Some(if day < 22 {
                    Constellation::Gemini
                } else {
                    Constellation::Cancer
                }),
                7 => Some(if day < 23 {
                    Constellation::Cancer
                } else {
                    Constellation::Leo
                }),
                8 => Some(if day < 23 {
                    Constellation::Leo
                } else {
                    Constellation::Virgo
                }),
                9 => Some(if day < 23 {
                    Constellation::Virgo
                } else {
                    Constellation::Libra
                }),
                10 => Some(if day < 23 {
                    Constellation::Libra
                } else {
                    Constellation::Scorpio
                }),
                11 => Some(if day < 22 {
                    Constellation::Scorpio
                } else {
                    Constellation::Sagittarius
                }),
                12 => Some(if day < 22 {
                    Constellation::Sagittarius
                } else {
                    Constellation::Capricorn
                }),
                _ => None,
            })
        }
        None => Ok(None),
    }
}

pub fn get_material<F, M>(moai: &Moai, operation: F) -> Result<Option<M>, RiverError>
where
    F: Fn(&Moai) -> Result<Option<M>, RiverError>,
{
    operation(moai)
}
