use super::errors::WeftError;
use rhai::{serde::from_dynamic, serde::to_dynamic, Engine, Scope, AST};
use serde_json::Value;
use std::{collections::HashMap, fs, path::Path};

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
            WeftError::Plugin(format!("读取历法 {} 失败: {error}", path.display()))
        })?;
        Self::load_script(name, &script)
    }

    pub fn load_script(name: &str, script: &str) -> Result<Self, WeftError> {
        let engine = limited_engine();
        let ast = engine.compile(script).map_err(|error| {
            WeftError::Plugin(format!("编译历法 {name} 失败: {error}"))
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
                WeftError::Plugin(format!("{}.{} 执行失败: {error}", self.name, entry))
            })
    }

    pub fn metadata(&self) -> Result<Value, WeftError> {
        let output = self.call("metadata", ())?;
        from_dynamic(&output)
            .map_err(|error| WeftError::Plugin(format!("历法 metadata 无效: {error}")))
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
            .ok_or_else(|| WeftError::Plugin("normalize 必须返回数组".into()))?;
        output
            .into_iter()
            .map(|item| {
                item.as_int()
                    .map_err(|_| WeftError::Plugin("normalize 必须返回整数数组".into()))
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
            .map_err(|_| WeftError::Plugin("to_tick 必须返回整数".into()))
    }

    pub fn humanize(&self, values: &[i64]) -> Result<String, WeftError> {
        let input = values
            .iter()
            .copied()
            .map(rhai::Dynamic::from_int)
            .collect::<rhai::Array>();
        self.call("humanize", (input,))?
            .into_string()
            .map_err(|_| WeftError::Plugin("humanize 必须返回字符串".into()))
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
                    .ok_or_else(|| WeftError::Plugin("material 注册名必须是字符串".into()))?;
                let config = config
                    .as_mapping()
                    .ok_or_else(|| WeftError::Plugin(format!("{name} 必须使用插件清单")))?;
                require_manifest(config, name, "material")?;
                let source = manifest_string(config, "source")?;
                let entry = manifest_string(config, "entry")?;
                let path = base.join(source);
                let script = fs::read_to_string(&path).map_err(|error| {
                    WeftError::Plugin(format!("读取 {} 失败: {error}", path.display()))
                })?;
                let ast = engine.compile(&script).map_err(|error| {
                    WeftError::Plugin(format!("编译 {} 失败: {error}", path.display()))
                })?;
                materials.insert(name.to_owned(), (ast, entry.into()));
            }
        }
        Ok(Self { engine, materials })
    }

    pub fn material(&self, name: &str, context: &Value) -> Result<Value, WeftError> {
        if name == "constellation" {
            return builtin_constellation(context);
        }
        let (ast, entry) = self
            .materials
            .get(name)
            .ok_or_else(|| WeftError::Reference(format!("未知的 material: {name:?}")))?;
        let argument = to_dynamic(context)
            .map_err(|error| WeftError::Plugin(format!("material 输入转换失败: {error}")))?;
        let output = self
            .engine
            .call_fn::<rhai::Dynamic>(&mut Scope::new(), ast, entry, (argument,))
            .map_err(|error| WeftError::Plugin(format!("{name}.{entry} 执行失败: {error}")))?;
        from_dynamic(&output)
            .map_err(|error| WeftError::Plugin(format!("{name}.material 返回值无效: {error}")))
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
        .ok_or_else(|| WeftError::Reference(format!("不支持的 date_mode: {name:?}")))?;
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
            "{name} 需要 runtime: rhai、kind: {kind}、api: 1"
        )));
    }
    Ok(())
}

fn manifest_string<'a>(config: &'a serde_yaml::Mapping, key: &str) -> Result<&'a str, WeftError> {
    config
        .get(serde_yaml::Value::String(key.into()))
        .and_then(serde_yaml::Value::as_str)
        .ok_or_else(|| WeftError::Plugin(format!("插件清单缺少字符串字段 {key}")))
}

fn builtin_constellation(context: &Value) -> Result<Value, WeftError> {
    let base = context
        .pointer("/moai/base_time/base_time")
        .and_then(Value::as_array)
        .ok_or_else(|| WeftError::Plugin("constellation 需要 moai.base_time".into()))?;
    let month = base.get(1).and_then(Value::as_i64).unwrap_or(0);
    let day = base.get(2).and_then(Value::as_i64).unwrap_or(0);
    let result = match (month, day) {
        (1, 20..) | (2, ..=18) => "水瓶座",
        (2, 19..) | (3, ..=20) => "双鱼座",
        (3, 21..) | (4, ..=19) => "白羊座",
        (4, 20..) | (5, ..=20) => "金牛座",
        (5, 21..) | (6, ..=21) => "双子座",
        (6, 22..) | (7, ..=22) => "巨蟹座",
        (7, 23..) | (8, ..=22) => "狮子座",
        (8, 23..) | (9, ..=22) => "处女座",
        (9, 23..) | (10, ..=23) => "天秤座",
        (10, 24..) | (11, ..=22) => "天蝎座",
        (11, 23..) | (12, ..=21) => "射手座",
        _ => "摩羯座",
    };
    Ok(Value::String(result.into()))
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
}
