use std::path::PathBuf;
use std::time::Duration;

use notify::{Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use tauri::{AppHandle, Emitter, State};

use crate::utils::error::AppError;
use crate::AppState;

#[tauri::command]
pub async fn start_watch(
    app: AppHandle,
    _state: State<'_, AppState>,
    repo_path: String,
) -> Result<(), AppError> {
    let path = PathBuf::from(&repo_path);
    let workdir_path = path.join(".git").join("index");
    let head_path = path.join(".git").join("HEAD");
    let refs_path = path.join(".git").join("refs");

    let (tx, rx) = std::sync::mpsc::channel();

    let mut watcher = RecommendedWatcher::new(
        move |res: Result<Event, notify::Error>| {
            if let Ok(event) = res {
                let _ = tx.send(event);
            }
        },
        Config::default().with_poll_interval(Duration::from_millis(500)),
    )?;

    watcher.watch(&workdir_path, RecursiveMode::NonRecursive)?;
    watcher.watch(&head_path, RecursiveMode::NonRecursive)?;
    watcher.watch(&refs_path, RecursiveMode::Recursive)?;

    let app_clone = app.clone();
    let repo_path_clone = repo_path.clone();

    tauri::async_runtime::spawn(async move {
        while let Ok(event) = rx.recv() {
            match event.kind {
                EventKind::Create(_) | EventKind::Modify(_) | EventKind::Remove(_) => {
                    for path in &event.paths {
                        if path.ends_with("index") {
                            let _ = app_clone.emit("index-changed", &repo_path_clone);
                            let _ = app_clone.emit("workdir-changed", &repo_path_clone);
                        } else if path.file_name().map(|f| f == "HEAD").unwrap_or(false) {
                            let _ = app_clone.emit("head-changed", &repo_path_clone);
                            let _ = app_clone.emit("ref-updated", &repo_path_clone);
                        } else {
                            let _ = app_clone.emit("ref-updated", &repo_path_clone);
                        }
                    }
                }
                _ => {}
            }
        }
    });

    Ok(())
}
