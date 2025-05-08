use super::errors::WeftError;
use crate::weft::aqueduct::Aqueduct;
use crate::weft::dao::Dao;
use crate::weft::dao::Story;
use notify::RecommendedWatcher;
use notify::RecursiveMode;
use notify::{
    event::{ModifyKind, RemoveKind, RenameMode},
    EventKind,
};
use notify_debouncer_full::{new_debouncer, Debouncer, RecommendedCache};
use serde_json::Value as JsonValue;
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{Emitter, Manager};
#[derive(Default, Debug)]
pub struct KappaFace {
    dao: Option<Dao>,
    aqueduct: Option<Aqueduct>,
    debouncer: Option<Debouncer<RecommendedWatcher, RecommendedCache>>,
    receiver: Option<std::sync::mpsc::Receiver<notify_debouncer_full::DebounceEventResult>>,
}

impl KappaFace {
    pub fn take_receiver(
        &mut self,
    ) -> Option<std::sync::mpsc::Receiver<notify_debouncer_full::DebounceEventResult>> {
        self.receiver.take()
    }

    fn init_debouncer(&mut self) -> Result<(), WeftError> {
        if self.debouncer.is_none() || self.receiver.is_none() {
            let (tx, rx) = std::sync::mpsc::channel();
            let debouncer = new_debouncer(std::time::Duration::from_millis(250), None, tx)
                .map_err(|e| WeftError::FileNotificationError(e))?;

            self.debouncer = Some(debouncer);
            self.receiver = Some(rx);
        }
        Ok(())
    }

    pub fn set_dao_and_aqueduct(&mut self, file_path: &PathBuf) -> Result<(), WeftError> {
        let mut dao = Dao::new(file_path)?;
        let aqueduct = match dao.aqueduct() {
            Some(paths) => {
                let aqueduct = Aqueduct::new();
                for path in paths {
                    aqueduct.add_plugin(path)?;
                }
                dao.resolve(&aqueduct)?;
                Some(aqueduct)
            }
            None => None,
        };

        self.dao = Some(dao);
        self.aqueduct = aqueduct;
        Ok(())
    }

    pub fn watch_file(&mut self, file_path: &PathBuf) -> Result<(), WeftError> {
        self.init_debouncer()?;

        self.set_dao_and_aqueduct(file_path)?;

        if let Some(debouncer) = &mut self.debouncer {
            debouncer
                .watch(&file_path, RecursiveMode::NonRecursive)
                .map_err(|e| WeftError::FileNotificationError(e))?;
        } else {
            return Err(WeftError::DebouncerNotInitialized);
        }

        Ok(())
    }

    pub fn unwatch_file(&mut self) {
        if let Some(debouncer) = self.debouncer.take() {
            debouncer.stop();
        }
        self.dao = None;
        self.receiver = None;
        self.aqueduct = None; //TODO: 需要清理aqueduct吗？
    }
}

#[tauri::command]
pub fn watch_file(app_handle: tauri::AppHandle, file_path: String) -> Result<(), String> {
    let state = app_handle.state::<Mutex<KappaFace>>();
    log::info!("start watching file");
    let mut kf = state.lock().map_err(|e| e.to_string())?;
    let file_path = PathBuf::from(file_path);

    kf.watch_file(&file_path).map_err(|e| e.to_string())?;

    let app_handle_clone = app_handle.clone();
    // Take the receiver from the state
    let receiver = kf.take_receiver().ok_or("No receiver available")?;

    std::thread::spawn(move || {
        for result in receiver.iter() {
            match result {
                Ok(events) => {
                    let mut should_exit = false;
                    for event in events {
                        match event.kind {
                            EventKind::Modify(ModifyKind::Data(_)) => {
                                // Handle file content modification
                                let state = app_handle_clone.state::<Mutex<KappaFace>>();
                                let mut kf = state.lock().expect("Mutex poisoned");

                                kf.set_dao_and_aqueduct(&file_path)
                                    .map_err(|e| {
                                        app_handle_clone
                                            .emit("dao-update-failed", e.to_string())
                                            .unwrap_or_else(|emit_err| {
                                                log::error!("Emit failed: {}", emit_err)
                                            })
                                    })
                                    .ok();
                                app_handle_clone
                                    .emit("file-changed", ())
                                    .unwrap_or_else(|e| log::error!("Emit failed: {}", e));
                            }
                            EventKind::Modify(ModifyKind::Name(
                                RenameMode::From | RenameMode::Both,
                            )) => {
                                let state = app_handle_clone.state::<Mutex<KappaFace>>();
                                let mut kf = state.lock().expect("Mutex poisoned");
                                kf.unwatch_file();
                                app_handle_clone
                                    .emit("stop-watching", ())
                                    .unwrap_or_else(|e| log::error!("Emit failed: {}", e));
                                should_exit = true;
                            }

                            EventKind::Remove(RemoveKind::File) => {
                                let state = app_handle_clone.state::<Mutex<KappaFace>>();
                                let mut kf = state.lock().expect("Mutex poisoned");
                                kf.unwatch_file();
                                app_handle_clone
                                    .emit("stop-watching", ())
                                    .unwrap_or_else(|e| log::error!("Emit failed: {}", e));
                                should_exit = true;
                            }
                            _ => {}
                        }
                        if should_exit {
                            break;
                        }
                    }
                    if should_exit {
                        break;
                    }
                }
                Err(e) => {
                    log::error!("Watch error: {:?}", e);
                    app_handle_clone
                        .emit("stop-watching", ())
                        .unwrap_or_else(|e| log::error!("Emit failed: {}", e));
                    break;
                }
            }
        }
        log::debug!("Watcher thread exited");
    });

    Ok(())
}

#[tauri::command]
pub fn unwatch_file(app_handle: tauri::AppHandle) -> Result<(), String> {
    let state = app_handle.state::<Mutex<KappaFace>>();
    let mut kf = state.lock().map_err(|e| e.to_string())?;
    kf.unwatch_file();
    Ok(())
}

#[tauri::command]
pub async fn get_story(state: tauri::State<'_, Mutex<KappaFace>>) -> Result<Option<Story>, String> {
    let kappa_face = state.lock().map_err(|e| e.to_string())?;
    let dao = kappa_face.dao.as_ref().ok_or("Dao not initialized")?;

    let story = dao.story();
    if let Some(story) = story {
        Ok(Some(story.clone()))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub async fn get_moai_full_name(
    state: tauri::State<'_, Mutex<KappaFace>>,
    id: String,
) -> Result<String, String> {
    let kappa_face = state.lock().map_err(|e| e.to_string())?;
    let dao = kappa_face.dao.as_ref().ok_or("Dao not initialized")?;
    let moai = dao.get_moai(&id).map_err(|e| e.to_string())?;
    Ok(moai.full_name().clone())
}

#[tauri::command]
pub async fn get_all_moais(
    state: tauri::State<'_, Mutex<KappaFace>>,
) -> Result<Option<HashMap<String, JsonValue>>, String> {
    let kappa_face = state.lock().map_err(|e| e.to_string())?;
    let dao = kappa_face.dao.as_ref().ok_or("Dao not initialized")?;
    dao.get_all_moais().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_all_moai_links(
    state: tauri::State<'_, Mutex<KappaFace>>,
) -> Result<Option<HashMap<String, serde_json::Value>>, String> {
    let kappa_face = state.lock().map_err(|e| e.to_string())?;
    let dao = kappa_face.dao.as_ref().ok_or("Dao not initialized")?;

    dao.get_all_moai_links().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn drift_flow(
    state: tauri::State<'_, Mutex<KappaFace>>,
) -> Result<HashMap<String, Vec<serde_json::Value>>, String> {
    let kappa_face = state.lock().map_err(|e| e.to_string())?;
    let dao = kappa_face.dao.as_ref().ok_or("Dao not initialized")?;
    let aqueduct = kappa_face.aqueduct.as_ref();
    dao.drift_flow(aqueduct).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn moai_flow(
    state: tauri::State<'_, Mutex<KappaFace>>,
) -> Result<HashMap<String, Vec<serde_json::Value>>, String> {
    let kappa_face = state.lock().map_err(|e| e.to_string())?;
    let dao = kappa_face.dao.as_ref().ok_or("Dao not initialized")?;
    let aqueduct = kappa_face.aqueduct.as_ref();
    dao.moai_flow(aqueduct).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn narrative_flow(
    state: tauri::State<'_, Mutex<KappaFace>>,
) -> Result<HashMap<String, Vec<serde_json::Value>>, String> {
    let kappa_face = state.lock().map_err(|e| e.to_string())?;
    let dao = kappa_face.dao.as_ref().ok_or("Dao not initialized")?;
    let aqueduct = kappa_face.aqueduct.as_ref();
    dao.narrative_flow(aqueduct).map_err(|e| e.to_string())
}
