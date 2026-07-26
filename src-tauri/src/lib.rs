use pyo3::prelude::*;
use serde::Deserialize;
use std::path::PathBuf;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::{DragDropEvent, Emitter, Listener, WindowEvent};

/// Bakes `tauri.conf.json` (+ capabilities/icons) into the binary at compile time.
pub fn tauri_generate_context() -> tauri::Context {
    tauri::generate_context!()
}

/// Builds the WEFT native menu (File / View / Settings / Help) and attaches it
/// to the app. Menu clicks are forwarded to the frontend as `weft-menu` events
/// whose payload is the menu item id (e.g. `"open"`, `"settings"`).
fn build_weft_menu<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> tauri::Result<()> {
    let file = Submenu::with_items(
        app,
        "File",
        true,
        &[
            &MenuItem::with_id(app, "open", "Open Story…", true, Some("CmdOrCtrl+O"))?,
            &MenuItem::with_id(app, "open_recent", "Open Recent…", true, Some("CmdOrCtrl+P"))?,
            // Start disabled — the frontend flips these on once a story is loaded.
            &MenuItem::with_id(app, "close", "Close Story", false, Some("CmdOrCtrl+W"))?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, "reload", "Reload Story", false, Some("CmdOrCtrl+R"))?,
        ],
    )?;
    let settings = Submenu::with_items(
        app,
        "Settings",
        true,
        &[&MenuItem::with_id(
            app,
            "preferences",
            "Preferences…",
            true,
            Some("CmdOrCtrl+,"),
        )?],
    )?;
    let help = Submenu::with_items(
        app,
        "Help",
        true,
        &[
            &MenuItem::with_id(app, "help_docs", "Documentation", true, None::<&str>)?,
            &MenuItem::with_id(app, "help_issue", "Report Issue", true, None::<&str>)?,
        ],
    )?;
    let menu = Menu::with_items(app, &[&file, &settings, &help])?;
    app.set_menu(menu)?;
    Ok(())
}

/// Forwards OS-level drag-and-drop events on the main window to the frontend.
///
/// Tauri intercepts file drops at the OS layer, so HTML5 `ondrop` events never
/// fire inside the webview. We re-emit the three states the UI cares about
/// (`weft-drag-enter`, `weft-drag-leave`, `weft-drag-drop`) with the first
/// dragged path as payload; the frontend shows an overlay and opens the file
/// when the user releases the mouse.
fn forward_drag_drop<R: tauri::Runtime>(window: &tauri::Window<R>, event: &DragDropEvent) {
    match event {
        DragDropEvent::Enter { paths, .. } => {
            if let Some(path) = paths.first() {
                let _ = window.emit("weft-drag-enter", drag_payload(path));
            }
        }
        DragDropEvent::Drop { paths, .. } => {
            if let Some(path) = paths.first() {
                let _ = window.emit("weft-drag-drop", drag_payload(path));
            }
        }
        DragDropEvent::Leave => {
            let _ = window.emit("weft-drag-leave", ());
        }
        _ => {}
    }
}

fn drag_payload(path: &PathBuf) -> String {
    path.to_string_lossy().into_owned()
}

/// Frontend's view of which story-scoped menu items should be clickable right now.
#[derive(Deserialize)]
struct MenuState {
    close: bool,
    reload: bool,
}

/// Listens for `weft-menu-state` from the frontend and toggles the File menu's
/// story-scoped items (Close / Reload). They start disabled at startup so the
/// user can't trigger them before any story is loaded.
fn register_menu_state_listener<R: tauri::Runtime>(app_handle: &tauri::AppHandle<R>) {
    let handle = app_handle.clone();
    app_handle.listen("weft-menu-state", move |event| {
        let payload: MenuState = match serde_json::from_str(event.payload()) {
            Ok(p) => p,
            Err(_) => return,
        };
        let Some(menu) = handle.menu() else {
            return;
        };
        if let Some(tauri::menu::MenuItemKind::MenuItem(item)) = menu.get("close") {
            let _ = item.set_enabled(payload.close);
        }
        if let Some(tauri::menu::MenuItemKind::MenuItem(item)) = menu.get("reload") {
            let _ = item.set_enabled(payload.reload);
        }
    });
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
            // pytauri.builder_factory() — default builder with the dialog/opener plugins
            // + native menu. Menu events are emitted as `weft-menu` with the
            // item id as payload; the frontend dispatches.
            |_args, _kwargs| {
                let builder = tauri::Builder::default()
                    .plugin(tauri_plugin_dialog::init())
                    .plugin(tauri_plugin_opener::init())
                    .on_window_event(|window, event| {
                        if let WindowEvent::DragDrop(drag_drop) = event {
                            forward_drag_drop(window, drag_drop);
                        }
                    })
                    .setup(|app| {
                        build_weft_menu(app.handle())?;
                        register_menu_state_listener(app.handle());
                        Ok(())
                    })
                    .on_menu_event(|app, event| {
                        let _ = app.emit("weft-menu", event.id().as_ref());
                    });
                Ok(builder)
            },
        )
    }
}
