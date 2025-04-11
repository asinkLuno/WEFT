use std::{
    collections::HashMap,
    path::PathBuf,
    sync::{Arc, Mutex, RwLock},
};

use rhai::{Dynamic, Engine, Scope, AST};
use serde_json::Value;

use super::{
    dao::Moai,
    errors::RiverError,
    phase::{Phase, PhaseNoRecusive},
};

/// Core Aqueduct structure that manages plugins and execution engine
#[derive(Default, Debug, Clone)]
pub struct Aqueduct {
    engine: Arc<RwLock<Engine>>,
    plugins: Arc<Mutex<HashMap<String, AST>>>,
}

/// Trait defining the interface for type-safe plugin calling
pub trait PluginCaller {
    /// Input type for the plugin
    type Input;
    /// Output type expected from the plugin
    type Output;

    /// Convert input type to Rhai Dynamic arguments
    fn prepare_args(input: Self::Input) -> Vec<Dynamic>;

    /// Validate and convert the raw output to expected type
    fn validate_output(output: Dynamic) -> Result<Self::Output, RiverError>;

    /// Main calling interface
    fn call(
        aqueduct: &Aqueduct,
        plugin_name: &str,
        input: Self::Input,
    ) -> Result<Self::Output, RiverError> {
        let args = Self::prepare_args(input);
        let raw_output = aqueduct.call_plugin(plugin_name, args)?;
        Self::validate_output(raw_output)
    }
}

// Implementation for Phase-related plugins
pub struct PhasePlugin;

impl PluginCaller for PhasePlugin {
    type Input = ([i32; Phase::MAX_LENGTH], usize, bool);
    type Output = Option<([i32; 2], bool)>;

    fn prepare_args(input: Self::Input) -> Vec<Dynamic> {
        let (time_vec, unit_index, extra_case) = input;
        let values: Vec<Dynamic> = time_vec.iter().map(|&v| Dynamic::from(v)).collect();
        vec![
            Dynamic::from_array(values),
            Dynamic::from(unit_index),
            Dynamic::from(extra_case),
        ]
    }

    fn validate_output(output: Dynamic) -> Result<Self::Output, RiverError> {
        if !output.is::<Self::Output>() {
            return Err(RiverError::SignatureMismatch(
                "Phase plugin return type mismatch".to_string(),
            ));
        }
        Ok(output.cast())
    }
}

pub struct MaterialPlugin;

impl PluginCaller for MaterialPlugin {
    type Input = Arc<Moai>;
    type Output = Option<Value>;

    fn prepare_args(input: Self::Input) -> Vec<Dynamic> {
        vec![Dynamic::from(input)]
    }

    fn validate_output(output: Dynamic) -> Result<Self::Output, RiverError> {
        let output_type = output.type_name();

        // Helper closure to create consistent error messages
        let conversion_error =
            || RiverError::SignatureMismatch(format!("Failed to convert {} to Value", output_type));

        match output_type {
            "string" => output
                .into_string()
                .map(|s| Some(Value::String(s)))
                .map_err(|_| conversion_error()),
            "i64" | "i32" | "int" => output
                .as_int()
                .map(|i| Some(Value::Number(i.into())))
                .map_err(|_| conversion_error()),
            "f64" | "f32" | "float" => output
                .as_float()
                .map(|f| {
                    Some(
                        serde_json::Number::from_f64(f)
                            .map(Value::Number)
                            .unwrap_or(Value::Null),
                    )
                })
                .map_err(|_| conversion_error()),
            "bool" => output
                .as_bool()
                .map(|b| Some(Value::Bool(b)))
                .map_err(|_| conversion_error()),
            "()" | "unit" | "void" | "null" => Ok(Some(Value::Null)),
            "option" => {
                if output.is_unit() {
                    Ok(None)
                } else {
                    Err(conversion_error())
                }
            }
            _ => Err(RiverError::SignatureMismatch(format!(
                "Unsupported material plugin return type: {}",
                output_type
            ))),
        }
    }
}

impl Aqueduct {
    /// Create a new Aqueduct instance
    pub fn new() -> Self {
        let mut engine = Engine::new();
        //https://rhai.rs/book/safety/max-stmt-depth.html
        engine.set_max_expr_depths(50, 50); //FIXME: 需要根据实际情况调整
        engine
            .register_type_with_name::<Moai>("Moai")
            .register_fn("base_time", |moai: &mut Arc<Moai>| {
                moai.base_time().cloned()
            });

        engine
            .register_type_with_name::<Phase>("Phase")
            .register_fn("de_recursive", |phase: Option<Phase>| {
                phase.and_then(|p| p.de_recursive().ok())
            });
        engine
            .register_type_with_name::<PhaseNoRecusive>("PhaseNoRecusive")
            .register_fn("absolute_time", |phase: Option<PhaseNoRecusive>| {
                phase.and_then(|p| p.absolute_time().ok())
            });
        engine
            .register_type::<Option<[i32; Phase::MAX_LENGTH]>>()
            .register_fn(
                "convert_to_dynamic",
                |v: Option<[i32; Phase::MAX_LENGTH]>| {
                    if let Some(v) = v {
                        v.into_iter()
                            .map(|x| x as i64)
                            .map(Dynamic::from)
                            .collect::<Vec<Dynamic>>()
                    } else {
                        (0..Phase::MAX_LENGTH)
                            .map(|_| Dynamic::from(0_i64))
                            .collect::<Vec<Dynamic>>()
                    }
                },
            );

        Self {
            engine: Arc::new(RwLock::new(engine)),
            plugins: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Add a plugin from file
    pub fn add_plugin(&self, path: &PathBuf) -> Result<(), RiverError> {
        if !path.exists() {
            return Err(RiverError::FileNotFound(path.to_string_lossy().to_string()));
        }

        let name = match path.file_stem() {
            Some(name) => name.to_string_lossy().to_string(),
            None => return Err(RiverError::FileNotFound(path.to_string_lossy().to_string())),
        };

        let ast = {
            let engine = self
                .engine
                .read()
                .map_err(|_| RiverError::MutexLockFailed)?;
            engine
                .compile_file(path.clone())
                .map_err(|e| RiverError::RhaiError(e))?
        };

        {
            let mut plugins = self
                .plugins
                .lock()
                .map_err(|_| RiverError::MutexLockFailed)?;
            plugins.insert(name, ast);
        }

        Ok(())
    }

    /// Raw plugin calling method
    fn call_plugin(&self, name: &str, args: Vec<Dynamic>) -> Result<Dynamic, RiverError> {
        let ast = {
            let plugins = self
                .plugins
                .lock()
                .map_err(|_| RiverError::MutexLockFailed)?;
            plugins
                .get(name)
                .ok_or_else(|| RiverError::FunctionNotFound(name.to_string()))?
                .clone()
        };

        let mut scope = Scope::new();
        let result = {
            let engine = self
                .engine
                .read()
                .map_err(|_| RiverError::MutexLockFailed)?;
            engine
                .call_fn(&mut scope, &ast, name, args)
                .map_err(|e| RiverError::RhaiError(e))?
        };

        Ok(result)
    }

    /// Type-safe plugin calling interface
    pub fn call_with<C: PluginCaller>(
        &self,
        plugin_name: &str,
        input: C::Input,
    ) -> Result<C::Output, RiverError> {
        C::call(self, plugin_name, input)
    }

    pub fn has_plugin(&self, name: &str) -> Result<bool, RiverError> {
        let plugins = self
            .plugins
            .lock()
            .map_err(|_| RiverError::MutexLockFailed)?;
        Ok(plugins.contains_key(name))
    }

    pub fn cleanup(&self) {
        if let Ok(mut plugins) = self.plugins.lock() {
            plugins.clear();
        }
    }
}
