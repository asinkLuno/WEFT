// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod river {
    pub mod dao;
    pub mod kappa;
    pub mod material;
    pub mod phase;
}
use crate::river::kappa::KappaFace;

use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
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
        .invoke_handler(tauri::generate_handler![
            river::kappa::watch_file,
            river::kappa::unwatch_file,
            river::kappa::get_story,
            river::kappa::get_moai_full_name,
            river::kappa::get_all_moais,
            river::kappa::get_all_moai_links,
            river::kappa::drift_flow,
            river::kappa::moai_flow,
            river::kappa::narrative_flow,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
