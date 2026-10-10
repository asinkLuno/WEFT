use tauri::menu::{CheckMenuItem, Menu, MenuItem, Submenu};
use tauri::{AppHandle, Emitter, Runtime};

// Rebuilt on every language change so its labels and checkmarks match the UI language.
fn build_menu<R: Runtime>(app: &AppHandle<R>, lng: &str) -> tauri::Result<Menu<R>> {
    let zh = lng == "zh";

    let open = MenuItem::with_id(
        app,
        "file-open",
        if zh { "打开文件…" } else { "Open File..." },
        true,
        Some("CmdOrCtrl+O"),
    )?;
    let close = MenuItem::with_id(
        app,
        "file-close",
        if zh { "关闭文件" } else { "Close File" },
        true,
        None::<&str>,
    )?;
    let file_menu = Submenu::with_items(
        app,
        if zh { "文件" } else { "File" },
        true,
        &[&open, &close],
    )?;

    let en_item = CheckMenuItem::with_id(app, "lang-en", "English", true, !zh, None::<&str>)?;
    let zh_item = CheckMenuItem::with_id(app, "lang-zh", "中文", true, zh, None::<&str>)?;
    let lang_menu = Submenu::with_items(
        app,
        if zh { "语言" } else { "Language" },
        true,
        &[&en_item, &zh_item],
    )?;

    Menu::with_items(app, &[&file_menu, &lang_menu])
}

#[tauri::command]
async fn read_yaml_file(path: String) -> Result<String, String> {
    if !path.ends_with(".yaml") && !path.ends_with(".yml") {
        return Err("not a YAML file".into());
    }
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn set_menu_language(app: AppHandle, lng: String) -> Result<(), String> {
    let menu = build_menu(&app, &lng).map_err(|e| e.to_string())?;
    app.set_menu(menu).map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // Default until the frontend reports the language it loaded from the store.
            app.set_menu(build_menu(app.handle(), "en")?)?;
            app.on_menu_event(|app, event| {
                let id = event.id().0.as_str();
                if let Some(lng) = id.strip_prefix("lang-") {
                    let _ = app.emit("language-changed", lng);
                } else if id == "file-open" || id == "file-close" {
                    let _ = app.emit(id, ());
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![read_yaml_file, set_menu_language])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
