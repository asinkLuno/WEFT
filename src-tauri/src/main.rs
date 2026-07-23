// Prevents an extra console window on Windows in release. DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{convert::Infallible, error::Error, path::PathBuf};

use pyo3::wrap_pymodule;
use pytauri::standalone::{
    dunce::simplified, PythonInterpreterBuilder, PythonInterpreterEnv, PythonScript,
};
use tauri::utils::platform::resource_dir;

use weft_lib::{ext_mod, tauri_generate_context};

fn main() -> Result<Infallible, Box<dyn Error>> {
    let py_env = if cfg!(dev) {
        // `tauri dev`: use the repo venv. `<repo>/src-tauri` -> `<repo>/.venv`.
        let mut venv_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        venv_dir.pop();
        venv_dir.push(".venv");
        assert!(
            venv_dir.is_dir(),
            "Python virtual environment not found at: {}",
            venv_dir.display()
        );
        PythonInterpreterEnv::Venv(venv_dir.into())
    } else {
        // `tauri build`: embedded python shipped in the app's resource directory.
        let context = tauri_generate_context();
        let resource_dir = resource_dir(context.package_info(), &tauri::Env::default())
            .map_err(|err| format!("failed to get resource dir: {err}"))?;
        // Strip the UNC prefix `\\?\` (Windows) — Python ecosystems dislike it.
        let resource_dir = simplified(&resource_dir).to_owned();
        PythonInterpreterEnv::Standalone(resource_dir.into())
    };

    // Equivalent to `python -m weft_backend.tauri_app` -> `__main__.py` -> `main()`.
    let py_script = PythonScript::Module("weft_backend.tauri_app".into());

    // `ext_mod` is exported from memory (no .pyd/.so on disk in standalone).
    let builder =
        PythonInterpreterBuilder::new(py_env, py_script, |py| wrap_pymodule!(ext_mod)(py));
    let interpreter = builder.build()?;

    let exit_code = interpreter.run();
    std::process::exit(exit_code);
}
