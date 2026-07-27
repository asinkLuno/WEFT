use super::errors::WeftError;
use rhai::{serde::from_dynamic, serde::to_dynamic, Engine, Scope, AST};
use serde_json::Value;
use std::{collections::HashMap, fs, path::Path};

const CONSTELLATION_CN: &str = include_str!("../../rhai/constellation_cn.rhai");
const CONSTELLATION_EN: &str = include_str!("../../rhai/constellation_en.rhai");
const CONSTELLATION_JA: &str = include_str!("../../rhai/constellation_ja.rhai");

pub struct RhaiRuntime {
    engine: Engine,
    materials: HashMap<String, (AST, String)>,
}

pub struct RhaiCalendar {
    engine: Engine,
    ast: AST,
    name: String,
}

impl std::fmt::Debug for RhaiCalendar {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("RhaiCalendar")
            .field("name", &self.name)
            .finish()
    }
}

impl RhaiCalendar {
    pub fn load(name: &str, path: &Path) -> Result<Self, WeftError> {
        let script = fs::read_to_string(path).map_err(|error| {
            WeftError::Plugin(format!("failed to read calendar {}: {error}", path.display()))
        })?;
        Self::load_script(name, &script)
    }

    pub fn load_script(name: &str, script: &str) -> Result<Self, WeftError> {
        let engine = limited_engine();
        let ast = engine.compile(script).map_err(|error| {
            WeftError::Plugin(format!("failed to compile calendar {name}: {error}"))
        })?;
        Ok(Self {
            engine,
            ast,
            name: name.into(),
        })
    }

    fn call(&self, entry: &str, args: impl rhai::FuncArgs) -> Result<rhai::Dynamic, WeftError> {
        self.engine
            .call_fn(&mut Scope::new(), &self.ast, entry, args)
            .map_err(|error| {
                WeftError::Plugin(format!("{}.{} execution failed: {error}", self.name, entry))
            })
    }

    pub fn metadata(&self) -> Result<Value, WeftError> {
        let output = self.call("metadata", ())?;
        from_dynamic(&output)
            .map_err(|error| WeftError::Plugin(format!("calendar metadata is invalid: {error}")))
    }

    pub fn normalize(&self, values: &[i64]) -> Result<Vec<i64>, WeftError> {
        let input = values
            .iter()
            .copied()
            .map(rhai::Dynamic::from_int)
            .collect::<rhai::Array>();
        let output = self.call("normalize", (input,))?;
        let output = output
            .try_cast::<rhai::Array>()
            .ok_or_else(|| WeftError::Plugin("normalize must return an array".into()))?;
        output
            .into_iter()
            .map(|item| {
                item.as_int()
                    .map_err(|_| WeftError::Plugin("normalize must return an integer array".into()))
            })
            .collect()
    }

    pub fn to_tick(&self, values: &[i64]) -> Result<i64, WeftError> {
        let input = values
            .iter()
            .copied()
            .map(rhai::Dynamic::from_int)
            .collect::<rhai::Array>();
        self.call("to_tick", (input,))?
            .as_int()
            .map_err(|_| WeftError::Plugin("to_tick must return an integer".into()))
    }

    pub fn humanize(&self, values: &[i64]) -> Result<String, WeftError> {
        let input = values
            .iter()
            .copied()
            .map(rhai::Dynamic::from_int)
            .collect::<rhai::Array>();
        self.call("humanize", (input,))?
            .into_string()
            .map_err(|_| WeftError::Plugin("humanize must return a string".into()))
    }

    pub fn extra(&self, values: &[i64]) -> Result<Value, WeftError> {
        let input = values
            .iter()
            .copied()
            .map(rhai::Dynamic::from_int)
            .collect::<rhai::Array>();
        let output = self.call("extra", (input,))?;
        from_dynamic(&output)
            .map_err(|error| WeftError::Plugin(format!("extra return value is invalid: {error}")))
    }
}

impl std::fmt::Debug for RhaiRuntime {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("RhaiRuntime")
            .field("materials", &self.materials.keys())
            .finish()
    }
}

impl RhaiRuntime {
    pub fn load(spec: Option<&serde_yaml::Mapping>, base: &Path) -> Result<Self, WeftError> {
        let engine = limited_engine();
        let mut materials = HashMap::new();
        if let Some(spec) = spec {
            for (name, config) in spec {
                let name = name
                    .as_str()
                    .ok_or_else(|| WeftError::Plugin("material name must be a string".into()))?;
                let config = config
                    .as_mapping()
                    .ok_or_else(|| WeftError::Plugin(format!("{name} must be a plugin manifest")))?;
                require_manifest(config, name, "material")?;
                let source = manifest_string(config, "source")?;
                let entry = manifest_string(config, "entry")?;
                let path = base.join(source);
                let script = fs::read_to_string(&path).map_err(|error| {
                    WeftError::Plugin(format!("failed to read {}: {error}", path.display()))
                })?;
                let ast = engine.compile(&script).map_err(|error| {
                    WeftError::Plugin(format!("failed to compile {}: {error}", path.display()))
                })?;
                materials.insert(name.to_owned(), (ast, entry.into()));
            }
        }
        for (name, script) in &[
            ("constellation", CONSTELLATION_CN),
            ("constellation_cn", CONSTELLATION_CN),
            ("constellation_en", CONSTELLATION_EN),
            ("constellation_ja", CONSTELLATION_JA),
        ] {
            if !materials.contains_key(*name) {
                let ast = engine.compile(*script).map_err(|error| {
                    WeftError::Plugin(format!("failed to compile built-in {name}: {error}"))
                })?;
                materials.insert(name.to_string(), (ast, "constellation".into()));
            }
        }
        Ok(Self { engine, materials })
    }

    pub fn material(&self, name: &str, context: &Value) -> Result<Value, WeftError> {
        let (ast, entry) = self
            .materials
            .get(name)
            .ok_or_else(|| WeftError::Reference(format!("unknown material: {name:?}")))?;
        let argument = to_dynamic(context)
            .map_err(|error| WeftError::Plugin(format!("material input conversion failed: {error}")))?;
        let output = self
            .engine
            .call_fn::<rhai::Dynamic>(&mut Scope::new(), ast, entry, (argument,))
            .map_err(|error| WeftError::Plugin(format!("{name}.{entry} execution failed: {error}")))?;
        from_dynamic(&output)
            .map_err(|error| WeftError::Plugin(format!("{name}.material return value is invalid: {error}")))
    }
}

fn limited_engine() -> Engine {
    let mut engine = Engine::new();
    engine.set_max_expr_depths(64, 32);
    engine.set_max_call_levels(32);
    engine.set_max_operations(100_000);
    engine.set_max_variables(256);
    engine.set_max_array_size(10_000);
    engine.set_max_map_size(1_000);
    engine.set_max_string_size(1_000_000);
    engine
}

pub fn calendar_source<'a>(
    spec: Option<&'a serde_yaml::Mapping>,
    name: &str,
) -> Result<&'a str, WeftError> {
    let config = spec
        .and_then(|mapping| mapping.get(serde_yaml::Value::String(name.into())))
        .and_then(serde_yaml::Value::as_mapping)
        .ok_or_else(|| WeftError::Reference(format!("unsupported date_mode: {name:?}")))?;
    require_manifest(config, name, "calendar")?;
    manifest_string(config, "source")
}

fn require_manifest(config: &serde_yaml::Mapping, name: &str, kind: &str) -> Result<(), WeftError> {
    if manifest_string(config, "runtime")? != "rhai"
        || manifest_string(config, "kind")? != kind
        || config
            .get(serde_yaml::Value::String("api".into()))
            .and_then(serde_yaml::Value::as_i64)
            != Some(1)
    {
        return Err(WeftError::Plugin(format!(
            "{name} requires runtime: rhai, kind: {kind}, api: 1"
        )));
    }
    Ok(())
}

fn manifest_string<'a>(config: &'a serde_yaml::Mapping, key: &str) -> Result<&'a str, WeftError> {
    config
        .get(serde_yaml::Value::String(key.into()))
        .and_then(serde_yaml::Value::as_str)
        .ok_or_else(|| WeftError::Plugin(format!("plugin manifest missing string field {key}")))
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn returns_nested_json_from_rhai() {
        let engine = Engine::new();
        let ast = engine
            .compile("fn material(ctx) { #{ name: ctx.moai.name, values: [1, true] } }")
            .unwrap();
        let runtime = RhaiRuntime {
            engine,
            materials: HashMap::from([("profile".into(), (ast, "material".into()))]),
        };
        let value = runtime
            .material("profile", &serde_json::json!({"moai": {"name": "甲"}}))
            .unwrap();
        assert_eq!(value["name"], "甲");
        assert_eq!(value["values"][1], true);
    }

    #[test]
    fn operation_limit_stops_runaway_script() {
        let engine = limited_engine();
        let ast = engine.compile("fn material(ctx) { loop {} }").unwrap();
        let error = engine
            .call_fn::<rhai::Dynamic>(&mut Scope::new(), &ast, "material", (rhai::Dynamic::UNIT,))
            .unwrap_err();
        assert!(error.to_string().contains("operations"));
    }

    #[test]
    fn runs_taohuashan_calendar_script() {
        let path =
            Path::new(env!("CARGO_MANIFEST_DIR")).join("../examples/calendars/taohuashan.rhai");
        let calendar = RhaiCalendar::load("taohuashan", &path).unwrap();

        assert_eq!(
            calendar.humanize(&[1645, 3, 19, 0, 0, 0]).unwrap(),
            "弘光元年（乙酉）三月十九"
        );
        assert_eq!(
            calendar.normalize(&[1645, 6, 30, 0, 0, 0]).unwrap(),
            [1645, 7, 1, 0, 0, 0]
        );
        assert_eq!(
            calendar.to_tick(&[1645, 4, 24, 0, 0, 0]).unwrap()
                - calendar.to_tick(&[1645, 4, 23, 0, 0, 0]).unwrap(),
            86_400
        );
    }
}
