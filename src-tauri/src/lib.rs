use notify_debouncer_full::notify::{RecommendedWatcher, RecursiveMode};
use notify_debouncer_full::{DebounceEventResult, Debouncer, RecommendedCache, new_debouncer};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use std::time::Duration;
use tauri::menu::{CheckMenuItem, IsMenuItem, Menu, MenuItem, Submenu};
use tauri::{AppHandle, Emitter, Runtime, State};

mod validate;

// Theme ids and names come from the frontend too, so the list of theme colors
// lives only in src/settings.ts, next to the CSS that defines them.
#[derive(Deserialize)]
struct ThemeItem {
    id: String,
    label: String,
}

// Text comes from the frontend so all translations stay in src/i18n/locales.
#[derive(Deserialize)]
#[serde(default)]
struct MenuLabels {
    file: String,
    open: String,
    close: String,
    settings: String,
    language: String,
    theme: String,
    themes: Vec<ThemeItem>,
}

// Shown from startup until the webview reports the stored language.
impl Default for MenuLabels {
    fn default() -> Self {
        Self {
            file: "File".into(),
            open: "Open File...".into(),
            close: "Close File".into(),
            settings: "Settings".into(),
            language: "Language".into(),
            theme: "Theme".into(),
            themes: Vec::new(), // empty until the webview boots, rather than a second copy of the list
        }
    }
}

// Rebuilt on every language or theme change so labels and checkmarks stay in sync.
fn build_menu<R: Runtime>(
    app: &AppHandle<R>,
    lng: &str,
    theme: &str,
    labels: &MenuLabels,
) -> tauri::Result<Menu<R>> {
    let zh = lng == "zh";

    let open = MenuItem::with_id(
        app,
        "file-open",
        labels.open.as_str(),
        true,
        Some("CmdOrCtrl+O"),
    )?;
    let close = MenuItem::with_id(
        app,
        "file-close",
        labels.close.as_str(),
        true,
        None::<&str>,
    )?;
    let file_menu = Submenu::with_items(app, &labels.file, true, &[&open, &close])?;

    // Language names stay in their own language.
    let en_item = CheckMenuItem::with_id(app, "lang-en", "English", true, !zh, None::<&str>)?;
    let zh_item = CheckMenuItem::with_id(app, "lang-zh", "中文", true, zh, None::<&str>)?;
    let lang_menu = Submenu::with_items(app, &labels.language, true, &[&en_item, &zh_item])?;

    let theme_items = labels
        .themes
        .iter()
        .map(|item| {
            CheckMenuItem::with_id(
                app,
                format!("theme-{}", item.id),
                item.label.as_str(),
                true,
                item.id == theme,
                None::<&str>,
            )
        })
        .collect::<tauri::Result<Vec<_>>>()?;
    let theme_refs: Vec<&dyn IsMenuItem<R>> = theme_items
        .iter()
        .map(|item| item as &dyn IsMenuItem<R>)
        .collect();
    let theme_menu = Submenu::with_items(app, &labels.theme, true, &theme_refs)?;

    let settings_menu =
        Submenu::with_items(app, &labels.settings, true, &[&lang_menu, &theme_menu])?;

    Menu::with_items(app, &[&file_menu, &settings_menu])
}

// Validation problems ride along with the content, so what the frontend shows and
// what it checked can never be out of sync (a watched-file reload re-checks for free).
#[derive(Serialize)]
struct LoadedFile {
    content: String,
    problems: Vec<validate::Problem>,
}

#[tauri::command]
async fn read_yaml_file(path: String) -> Result<LoadedFile, String> {
    if !path.ends_with(".yaml") && !path.ends_with(".yml") {
        return Err("notYaml".into()); // a code, the frontend translates it
    }
    let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let problems = validate::validate(&content); // problems are not load failures
    Ok(LoadedFile { content, problems })
}

// Holding the debouncer is what keeps the watch alive; dropping it stops it.
#[derive(Default)]
struct WatchState(Mutex<Option<Debouncer<RecommendedWatcher, RecommendedCache>>>);

/// Binds the browser to one file, or unbinds it when `path` is None.
#[tauri::command]
fn bind_yaml_file(
    app: AppHandle,
    state: State<'_, WatchState>,
    path: Option<String>,
) -> Result<(), String> {
    let mut slot = state.0.lock().unwrap();
    *slot = None; // unbind first, so a failed rebind cannot leave a stale watcher

    let Some(path) = path else { return Ok(()) };
    let path = std::fs::canonicalize(&path).map_err(|e| e.to_string())?;
    let dir = path
        .parent()
        .ok_or_else(|| "no parent directory".to_string())?
        .to_path_buf();

    // Editors save atomically (tmp file + rename), which drops a watch on the file itself,
    // so watch the parent directory and filter by name. We never write, so nothing we
    // do can come back as an event.
    let filter = path.clone();
    let mut debouncer = new_debouncer(
        Duration::from_millis(200),
        None,
        move |result: DebounceEventResult| {
            let touched = match result {
                Ok(events) => events.iter().any(|e| e.paths.contains(&filter)),
                Err(_) => false, // watch errors are not file changes
            };
            if touched {
                let _ = app.emit("file-changed", ());
            }
        },
    )
    .map_err(|e| e.to_string())?;
    debouncer
        .watch(&dir, RecursiveMode::NonRecursive)
        .map_err(|e| e.to_string())?;

    *slot = Some(debouncer);
    Ok(())
}

#[tauri::command]
fn set_menu(app: AppHandle, lng: String, theme: String, labels: MenuLabels) -> Result<(), String> {
    let menu = build_menu(&app, &lng, &theme, &labels).map_err(|e| e.to_string())?;
    app.set_menu(menu).map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .manage(WatchState::default())
        .setup(|app| {
            // English/neutral until the frontend reports what it loaded from the store.
            app.set_menu(build_menu(
                app.handle(),
                "en",
                "neutral",
                &MenuLabels::default(),
            )?)?;
            app.on_menu_event(|app, event| {
                let id = event.id().0.as_str();
                if let Some(lng) = id.strip_prefix("lang-") {
                    let _ = app.emit("language-changed", lng);
                } else if let Some(theme) = id.strip_prefix("theme-") {
                    let _ = app.emit("theme-changed", theme);
                } else if id == "file-open" || id == "file-close" {
                    let _ = app.emit(id, ());
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            read_yaml_file,
            set_menu,
            bind_yaml_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
