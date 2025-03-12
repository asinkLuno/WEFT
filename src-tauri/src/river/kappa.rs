use crate::river::dao::Dao;
use crate::river::dao::Story;
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

use super::errors::RiverError;
#[derive(Default, Debug)]
pub struct KappaFace {
    file_path: Option<PathBuf>,
    dao: Option<Dao>,
    debouncer: Option<Debouncer<RecommendedWatcher, RecommendedCache>>,
    receiver: Option<std::sync::mpsc::Receiver<notify_debouncer_full::DebounceEventResult>>,
}

impl KappaFace {
    pub fn take_receiver(
        &mut self,
    ) -> Option<std::sync::mpsc::Receiver<notify_debouncer_full::DebounceEventResult>> {
        self.receiver.take()
    }

    fn init_debouncer(&mut self) -> Result<(), RiverError> {
        if self.debouncer.is_none() || self.receiver.is_none() {
            let (tx, rx) = std::sync::mpsc::channel();
            let debouncer = new_debouncer(std::time::Duration::from_millis(250), None, tx)
                .map_err(|e| RiverError::FailedInNotify(e))?;

            self.debouncer = Some(debouncer);
            self.receiver = Some(rx);
        }
        Ok(())
    }

    pub fn watch_file(&mut self, file_path: &str) -> Result<(), RiverError> {
        self.init_debouncer()?;
        let file_path = PathBuf::from(file_path);
        log::info!("Setting file_path to {:?}", file_path);

        // Validate Dao creation to avoid unwrap
        let dao = Dao::new(&file_path)?;

        self.file_path = Some(file_path.clone());
        self.dao = Some(dao);

        if let Some(debouncer) = &mut self.debouncer {
            debouncer
                .watch(&file_path, RecursiveMode::NonRecursive)
                .map_err(|e| RiverError::FailedInNotify(e))?;
        } else {
            return Err(RiverError::DebouncerNotInitialized);
        }

        Ok(())
    }

    pub fn unwatch_file(&mut self) {
        if let Some(debouncer) = self.debouncer.take() {
            debouncer.stop();
        }
        self.file_path = None;
        self.dao = None;
        self.receiver = None;
    }

    pub fn update_dao(&mut self) -> Result<(), RiverError> {
        let file_path: &PathBuf = match &self.file_path {
            Some(p) => p,
            None => {
                return Err(RiverError::DaoNotInitialized);
            }
        };

        let dao = Dao::new(file_path)?;
        self.dao = Some(dao);
        Ok(())
    }
}

#[tauri::command]
pub fn watch_file(app_handle: tauri::AppHandle, file_path: String) -> Result<(), String> {
    let state = app_handle.state::<Mutex<KappaFace>>();
    log::info!("start watching file");
    let mut kf = state.lock().map_err(|e| e.to_string())?;

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

                                kf.update_dao()
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
pub async fn get_story(state: tauri::State<'_, Mutex<KappaFace>>) -> Result<Story, String> {
    let kappa_face = state.lock().map_err(|e| e.to_string())?;
    let dao = kappa_face.dao.as_ref().ok_or("Dao not initialized")?;

    let story = dao.story();
    Ok(story.clone())
}

#[tauri::command]
pub async fn get_moai_full_name(
    state: tauri::State<'_, Mutex<KappaFace>>,
    id: String,
) -> Result<String, String> {
    let kappa_face = state.lock().map_err(|e| e.to_string())?;
    let dao = kappa_face.dao.as_ref().ok_or("Dao not initialized")?;
    dao.get_moai_full_name(&id).map_err(|e| e.to_string())
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
    dao.drift_flow().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn moai_flow(
    state: tauri::State<'_, Mutex<KappaFace>>,
) -> Result<HashMap<String, Vec<serde_json::Value>>, String> {
    let kappa_face = state.lock().map_err(|e| e.to_string())?;
    let dao = kappa_face.dao.as_ref().ok_or("Dao not initialized")?;
    dao.moai_flow().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn narrative_flow(
    state: tauri::State<'_, Mutex<KappaFace>>,
) -> Result<HashMap<String, Vec<serde_json::Value>>, String> {
    let kappa_face = state.lock().map_err(|e| e.to_string())?;
    let dao = kappa_face.dao.as_ref().ok_or("Dao not initialized")?;
    dao.narrative_flow().map_err(|e| e.to_string())
}
