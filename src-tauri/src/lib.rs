// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod weft{
    pub mod aqueduct;
    pub mod dao;
    pub mod errors;
    pub mod kappa;
    pub mod phase;
    pub mod utils;
}
use crate::weft::kappa::KappaFace;

// use serde_json::json;
use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_log::Builder::new().build())
        .setup(|app| {
            app.manage(Mutex::new(KappaFace::default()));
            Ok(())
        })
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            weft::kappa::watch_file,
            weft::kappa::unwatch_file,
            weft::kappa::get_story,
            weft::kappa::get_moai_full_name,
            weft::kappa::get_all_moais,
            weft::kappa::get_all_moai_links,
            weft::kappa::drift_flow,
            weft::kappa::moai_flow,
            weft::kappa::narrative_flow,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
