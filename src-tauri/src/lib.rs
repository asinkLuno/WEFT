use pyo3::prelude::*;

/// Bakes `tauri.conf.json` (+ capabilities/icons) into the binary at compile time.
pub fn tauri_generate_context() -> tauri::Context {
    tauri::generate_context!()
}

/// The pyo3 module pytauri injects into the embedded interpreter as
/// `sys.modules["__pytauri_ext_mod__"]`. Its `pymodule_export` registers
/// `pytauri.context_factory` / `pytauri.builder_factory` (Rust closures) that the
/// Python `main()` calls. No Rust commands are needed because WEFT commands
/// live in Python.
#[pymodule(gil_used = false)]
#[pyo3(name = "ext_mod")]
pub mod ext_mod {
    use super::*;

    #[pymodule_init]
    fn init(module: &Bound<'_, PyModule>) -> PyResult<()> {
        pytauri::pymodule_export(
            module,
            // pytauri.context_factory() — config baked into the binary.
            |_args, _kwargs| Ok(tauri_generate_context()),
            // pytauri.builder_factory() — a default builder with the dialog plugin
            // initialized (used by the Python `open_story` command).
            |_args, _kwargs| {
                let builder = tauri::Builder::default().plugin(tauri_plugin_dialog::init());
                Ok(builder)
            },
        )
    }
}
