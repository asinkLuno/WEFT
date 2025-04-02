use std::{
    collections::HashMap,
    path::PathBuf,
    sync::{Arc, Mutex, RwLock},
};

use rhai::{Dynamic, Engine, Scope, AST};

use super::{errors::RiverError, phase::Phase};

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

// Implementation for Material-related plugins
pub struct MaterialPlugin;

impl PluginCaller for MaterialPlugin {
    type Input = (f32, String, Vec<u8>);
    type Output = HashMap<String, f64>;

    fn prepare_args(input: Self::Input) -> Vec<Dynamic> {
        let (density, name, data) = input;
        vec![
            Dynamic::from(density),
            Dynamic::from(name),
            Dynamic::from(data),
        ]
    }

    fn validate_output(output: Dynamic) -> Result<Self::Output, RiverError> {
        if !output.is::<Self::Output>() {
            return Err(RiverError::SignatureMismatch(
                "Material plugin return type mismatch".to_string(),
            ));
        }
        Ok(output.cast())
    }
}

impl Aqueduct {
    /// Create a new Aqueduct instance
    pub fn new() -> Self {
        let mut engine = Engine::new();
        //https://rhai.rs/book/safety/max-stmt-depth.html
        engine.set_max_expr_depths(50, 50);

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

    /// Creates a partial function with fixed plugin_name and PluginCaller type
    pub fn create_caller<C: PluginCaller + 'static>(
        &self,
        plugin_name: String,
    ) -> impl Fn(C::Input) -> Result<C::Output, RiverError> + '_ {
        move |input| self.call_with::<C>(&plugin_name, input)
    }

    /// Check if plugin exists
    pub fn has_plugin(&self, name: &str) -> Result<bool, RiverError> {
        let plugins = self
            .plugins
            .lock()
            .map_err(|_| RiverError::MutexLockFailed)?;
        Ok(plugins.contains_key(name))
    }

    /// Clean up all plugins
    pub fn cleanup(&self) {
        if let Ok(mut plugins) = self.plugins.lock() {
            plugins.clear();
        }
    }
}
