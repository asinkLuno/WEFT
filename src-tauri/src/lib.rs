#![allow(clippy::result_large_err)] // Tauri serializes structured error payloads directly.

mod weft;

use chrono::{DateTime, Local};
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use std::{
    collections::BTreeMap,
    fs,
    path::PathBuf,
    thread,
    time::{Duration, SystemTime},
};
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
    DragDropEvent, Emitter, Listener, Manager, WindowEvent,
};
use tauri_plugin_dialog::DialogExt;
use weft::dao::{Dao, Drift, LinkGraph, Moai, Narrative, Story};
use weft::errors::{ErrorPayload, WeftError};

#[derive(Default)]
struct AppState {
    snapshot: RwLock<Snapshot>,
}

#[derive(Default)]
struct Snapshot {
    dao: Option<Dao>,
    story_path: Option<PathBuf>,
    last_error: Option<ErrorPayload>,
    last_reload_at: Option<DateTime<Local>>,
    last_modified: Option<SystemTime>,
    file_lost_reported: bool,
}

impl AppState {
    fn load(&self, path: PathBuf) -> Result<(), ErrorPayload> {
        match weft::dao::load(&path) {
            Ok(dao) => {
                let modified = fs::metadata(&path).and_then(|meta| meta.modified()).ok();
                let mut state = self.snapshot.write();
                state.dao = Some(dao);
                state.story_path = Some(path);
                state.last_error = None;
                state.last_reload_at = Some(Local::now());
                state.last_modified = modified;
                state.file_lost_reported = false;
                Ok(())
            }
            Err(error) => {
                let payload = error.payload(Some(&path));
                self.snapshot.write().last_error = Some(payload.clone());
                Err(payload)
            }
        }
    }

    fn reload_if_current(
        &self,
        path: &PathBuf,
        modified: SystemTime,
    ) -> Option<Result<Option<String>, ErrorPayload>> {
        let loaded = weft::dao::load(path);
        let mut state = self.snapshot.write();
        if state.story_path.as_ref() != Some(path) {
            return None;
        }
        state.last_modified = Some(modified);
        Some(match loaded {
            Ok(dao) => {
                let title = Some(dao.story.title.clone());
                state.dao = Some(dao);
                state.last_error = None;
                state.last_reload_at = Some(Local::now());
                state.file_lost_reported = false;
                Ok(title)
            }
            Err(error) => {
                let payload = error.payload(Some(path));
                state.last_error = Some(payload.clone());
                Err(payload)
            }
        })
    }
}

#[derive(Serialize)]
struct OpenedStory {
    title: String,
    path: String,
}

#[derive(Serialize)]
struct AppStateInfo {
    story_path: Option<String>,
    story_title: Option<String>,
    last_reload_at: Option<String>,
}

#[derive(Serialize)]
struct ReloadResult {
    story_title: Option<String>,
    last_reload_at: Option<String>,
}

fn require_dao<T>(
    state: &tauri::State<'_, AppState>,
    map: impl FnOnce(&Dao) -> T,
) -> Result<T, ErrorPayload> {
    let snapshot = state.snapshot.read();
    snapshot
        .dao
        .as_ref()
        .map(map)
        .ok_or_else(|| WeftError::StoryNotLoaded.into())
}

fn set_story_menu_enabled<R: tauri::Runtime>(app: &tauri::AppHandle<R>, close: bool, reload: bool) {
    let Some(menu) = app.menu() else { return };
    let Ok(items) = menu.items() else { return };
    for item in items {
        if let tauri::menu::MenuItemKind::Submenu(submenu) = item {
            if let Some(tauri::menu::MenuItemKind::MenuItem(item)) = submenu.get("close") {
                let _ = item.set_enabled(close);
            }
            if let Some(tauri::menu::MenuItemKind::MenuItem(item)) = submenu.get("reload") {
                let _ = item.set_enabled(reload);
            }
        }
    }
}

#[tauri::command]
fn has_story(state: tauri::State<'_, AppState>) -> bool {
    state.snapshot.read().dao.is_some()
}

#[tauri::command]
fn get_story(state: tauri::State<'_, AppState>) -> Result<Story, ErrorPayload> {
    require_dao(&state, |dao| dao.story.clone())
}

#[tauri::command]
fn get_calendar_metadata(
    state: tauri::State<'_, AppState>,
) -> Result<weft::aqueduct::CalendarMetadata, ErrorPayload> {
    require_dao(&state, |dao| dao.calendar_metadata.clone())
}

#[tauri::command]
fn get_moai(state: tauri::State<'_, AppState>) -> Result<BTreeMap<String, Moai>, ErrorPayload> {
    require_dao(&state, |dao| dao.moai.clone())
}

#[tauri::command]
fn get_drift(
    state: tauri::State<'_, AppState>,
) -> Result<BTreeMap<String, Vec<Drift>>, ErrorPayload> {
    require_dao(&state, |dao| dao.drift.clone())
}

#[tauri::command]
fn get_narrative(
    state: tauri::State<'_, AppState>,
) -> Result<BTreeMap<String, Narrative>, ErrorPayload> {
    require_dao(&state, |dao| dao.narrative.clone())
}

#[tauri::command]
fn get_moai_link(state: tauri::State<'_, AppState>) -> Result<LinkGraph, ErrorPayload> {
    require_dao(&state, |dao| dao.link_graph.clone())
}

#[tauri::command]
fn get_load_error(state: tauri::State<'_, AppState>) -> Option<ErrorPayload> {
    state.snapshot.read().last_error.clone()
}

#[tauri::command]
async fn open_story(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<Option<OpenedStory>, ErrorPayload> {
    let Some(file) = app
        .dialog()
        .file()
        .add_filter("YAML story", &["yaml", "yml"])
        .set_title("Open WEFT story")
        .blocking_pick_file()
    else {
        return Ok(None);
    };
    let path = file
        .into_path()
        .map_err(|error| WeftError::Read(error.to_string()).payload(None))?;
    state.load(path.clone())?;
    set_story_menu_enabled(&app, true, true);
    let title = require_dao(&state, |dao| dao.story.title.clone())?;
    Ok(Some(OpenedStory {
        title,
        path: path.display().to_string(),
    }))
}

#[derive(Deserialize)]
struct OpenRecentStoryRequest {
    path: String,
}

#[tauri::command]
fn open_recent_story(
    body: Option<OpenRecentStoryRequest>,
    path: Option<String>,
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<OpenedStory, ErrorPayload> {
    let path = PathBuf::from(
        path.or_else(|| body.map(|body| body.path))
            .ok_or_else(|| WeftError::Schema("missing story path".into()).payload(None))?,
    );
    state.load(path.clone())?;
    set_story_menu_enabled(&app, true, true);
    let title = require_dao(&state, |dao| dao.story.title.clone())?;
    Ok(OpenedStory {
        title,
        path: path.display().to_string(),
    })
}

#[tauri::command]
fn close_story(app: tauri::AppHandle, state: tauri::State<'_, AppState>) {
    *state.snapshot.write() = Snapshot::default();
    set_story_menu_enabled(&app, false, false);
}

#[tauri::command]
fn reload_story(state: tauri::State<'_, AppState>) -> Result<ReloadResult, ErrorPayload> {
    let path = state
        .snapshot
        .read()
        .story_path
        .clone()
        .ok_or_else(|| ErrorPayload::from(WeftError::StoryNotLoaded))?;
    state.load(path)?;
    let snapshot = state.snapshot.read();
    Ok(ReloadResult {
        story_title: snapshot.dao.as_ref().map(|dao| dao.story.title.clone()),
        last_reload_at: snapshot.last_reload_at.map(|time| time.to_rfc3339()),
    })
}

#[tauri::command]
fn get_app_state(state: tauri::State<'_, AppState>) -> AppStateInfo {
    let snapshot = state.snapshot.read();
    AppStateInfo {
        story_path: snapshot
            .story_path
            .as_ref()
            .map(|path| path.display().to_string()),
        story_title: snapshot.dao.as_ref().map(|dao| dao.story.title.clone()),
        last_reload_at: snapshot.last_reload_at.map(|time| time.to_rfc3339()),
    }
}

struct MenuTexts {
    file: &'static str,
    open: &'static str,
    open_recent: &'static str,
    close: &'static str,
    reload: &'static str,
    settings: &'static str,
    preferences: &'static str,
    help: &'static str,
    help_docs: &'static str,
    help_issue: &'static str,
}

fn menu_texts(lang: &str) -> MenuTexts {
    match lang {
        "zh-CN" => MenuTexts {
            file: "文件",
            open: "打开故事…",
            open_recent: "打开最近…",
            close: "关闭故事",
            reload: "重新加载",
            settings: "设置",
            preferences: "偏好设置…",
            help: "帮助",
            help_docs: "文档",
            help_issue: "报告问题",
        },
        "zh-TW" => MenuTexts {
            file: "檔案",
            open: "開啟故事…",
            open_recent: "開啟最近…",
            close: "關閉故事",
            reload: "重新載入",
            settings: "設定",
            preferences: "偏好設定…",
            help: "幫助",
            help_docs: "文件",
            help_issue: "回報問題",
        },
        "lzh" => MenuTexts {
            file: "檔",
            open: "啟故事…",
            open_recent: "啟近者…",
            close: "闔故事",
            reload: "重載",
            settings: "設",
            preferences: "設…",
            help: "助",
            help_docs: "文",
            help_issue: "報謬",
        },
        "ja" => MenuTexts {
            file: "ファイル",
            open: "ストーリーを開く…",
            open_recent: "最近を開く…",
            close: "ストーリーを閉じる",
            reload: "再読み込み",
            settings: "設定",
            preferences: "環境設定…",
            help: "ヘルプ",
            help_docs: "ドキュメント",
            help_issue: "問題を報告",
        },
        "eo" => MenuTexts {
            file: "Dosiero",
            open: "Malfermi rakonton…",
            open_recent: "Malfermi lastatempajn…",
            close: "Fermi rakonton",
            reload: "Reŝargi",
            settings: "Agordoj",
            preferences: "Agordoj…",
            help: "Helpo",
            help_docs: "Dokumentaro",
            help_issue: "Raporto problemon",
        },
        _ => MenuTexts {
            file: "File",
            open: "Open Story…",
            open_recent: "Open Recent…",
            close: "Close Story",
            reload: "Reload Story",
            settings: "Settings",
            preferences: "Preferences…",
            help: "Help",
            help_docs: "Documentation",
            help_issue: "Report Issue",
        },
    }
}

fn build_menu<R: tauri::Runtime>(app: &tauri::AppHandle<R>, lang: &str) -> tauri::Result<()> {
    let t = menu_texts(lang);
    let file = Submenu::with_items(
        app,
        t.file,
        true,
        &[
            &MenuItem::with_id(app, "open", t.open, true, Some("CmdOrCtrl+O"))?,
            &MenuItem::with_id(app, "open_recent", t.open_recent, true, Some("CmdOrCtrl+P"))?,
            &MenuItem::with_id(app, "close", t.close, false, Some("CmdOrCtrl+W"))?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, "reload", t.reload, false, Some("CmdOrCtrl+R"))?,
        ],
    )?;
    let settings = Submenu::with_items(
        app,
        t.settings,
        true,
        &[&MenuItem::with_id(
            app,
            "preferences",
            t.preferences,
            true,
            Some("CmdOrCtrl+,"),
        )?],
    )?;
    let help = Submenu::with_items(
        app,
        t.help,
        true,
        &[
            &MenuItem::with_id(app, "help_docs", t.help_docs, true, None::<&str>)?,
            &MenuItem::with_id(app, "help_issue", t.help_issue, true, None::<&str>)?,
        ],
    )?;
    app.set_menu(Menu::with_items(app, &[&file, &settings, &help])?)?;
    Ok(())
}

#[tauri::command]
fn set_language(app: tauri::AppHandle, lang: String) -> tauri::Result<()> {
    build_menu(&app, &lang)
}

fn register_menu_state_listener<R: tauri::Runtime>(app_handle: &tauri::AppHandle<R>) {
    #[derive(Deserialize)]
    struct MenuState {
        close: bool,
        reload: bool,
    }
    let handle = app_handle.clone();
    app_handle.listen("weft-menu-state", move |event| {
        let Ok(payload) = serde_json::from_str::<MenuState>(event.payload()) else {
            return;
        };
        set_story_menu_enabled(&handle, payload.close, payload.reload);
    });
}

fn forward_drag_drop<R: tauri::Runtime>(window: &tauri::Window<R>, event: &DragDropEvent) {
    match event {
        DragDropEvent::Enter { paths, .. } => {
            if let Some(path) = paths.first() {
                let _ = window.emit("weft-drag-enter", path.display().to_string());
            }
        }
        DragDropEvent::Drop { paths, .. } => {
            if let Some(path) = paths.first() {
                let _ = window.emit("weft-drag-drop", path.display().to_string());
            }
        }
        DragDropEvent::Leave => {
            let _ = window.emit("weft-drag-leave", ());
        }
        _ => {}
    }
}

fn start_story_watcher(app: tauri::AppHandle) {
    thread::spawn(move || loop {
        thread::sleep(Duration::from_millis(500));
        let state = app.state::<AppState>();
        let (path, previous, lost_reported) = {
            let snapshot = state.snapshot.read();
            (
                snapshot.story_path.clone(),
                snapshot.last_modified,
                snapshot.file_lost_reported,
            )
        };
        let Some(path) = path else { continue };
        let modified = fs::metadata(&path).and_then(|meta| meta.modified());
        match modified {
            Ok(modified) if previous != Some(modified) => {
                if let Some(result) = state.reload_if_current(&path, modified) {
                    match result {
                        Ok(title) => {
                            let _ = app
                                .emit("weft-reloaded", serde_json::json!({ "story_title": title }));
                        }
                        Err(error) => {
                            let _ = app.emit("weft-error", serde_json::json!({ "error": error }));
                        }
                    }
                }
            }
            Err(_) if !lost_reported => {
                state.snapshot.write().file_lost_reported = true;
                let _ = app.emit(
                    "weft-file-lost",
                    serde_json::json!({ "path": path.display().to_string() }),
                );
            }
            _ => {}
        }
    });
}

pub fn run() {
    let state = AppState::default();
    if let Some(path) = std::env::args().nth(1) {
        let _ = state.load(PathBuf::from(path));
    }
    tauri::Builder::default()
        .manage(state)
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .on_window_event(|window, event| {
            if let WindowEvent::DragDrop(event) = event {
                forward_drag_drop(window, event);
            }
        })
        .setup(|app| {
            build_menu(app.handle(), "en")?;
            let has_story = app.state::<AppState>().snapshot.read().dao.is_some();
            set_story_menu_enabled(app.handle(), has_story, has_story);
            register_menu_state_listener(app.handle());
            start_story_watcher(app.handle().clone());
            Ok(())
        })
        .on_menu_event(|app, event| {
            let _ = app.emit("weft-menu", event.id().as_ref());
        })
        .invoke_handler(tauri::generate_handler![
            set_language,
            has_story,
            get_story,
            get_calendar_metadata,
            get_moai,
            get_drift,
            get_narrative,
            get_moai_link,
            get_load_error,
            open_story,
            open_recent_story,
            close_story,
            reload_story,
            get_app_state
        ])
        .run(tauri::generate_context!())
        .expect("failed to run WEFT");
}

pub fn run_mcp() -> Result<(), Box<dyn std::error::Error>> {
    weft::mcp::run()
}
