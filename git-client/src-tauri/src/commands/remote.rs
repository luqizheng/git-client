use crate::models::remote::RemoteInfo;
use crate::services::remote_service::{self, FetchProgress, PushProgress};
use crate::utils::error::AppError;
use crate::AppState;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};

#[tauri::command]
pub async fn list_remotes(
    state: State<'_, AppState>,
    repo_path: String,
) -> Result<Vec<RemoteInfo>, AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        remote_service::list_remotes(&repo)
    })
    .await?
}

#[tauri::command]
pub async fn add_remote(
    state: State<'_, AppState>,
    repo_path: String,
    name: String,
    url: String,
) -> Result<(), AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        remote_service::add_remote(&repo, &name, &url)
    })
    .await?
}

#[tauri::command]
pub async fn fetch(
    app: AppHandle,
    state: State<'_, AppState>,
    repo_path: String,
    remote: String,
) -> Result<remote_service::FetchResult, AppError> {
    let repos = state.repos.clone();
    let app_clone = app.clone();
    let remote_clone = remote.clone();

    let progress_callback: Option<Arc<dyn Fn(FetchProgress) + Send + Sync>> =
        Some(Arc::new(move |progress: FetchProgress| {
            let _ = app_clone.emit("fetch-progress", serde_json::json!({
                "remote": remote_clone,
                "stage": progress.stage,
                "phase": progress.phase,
                "processed": progress.processed,
                "total": progress.total,
                "bytesProcessed": progress.bytes_processed,
                "bytesTotal": progress.bytes_total
            }));
        }));

    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        remote_service::fetch(&repo, &remote, progress_callback)
    })
    .await?
}

#[tauri::command]
pub async fn pull(
    app: AppHandle,
    state: State<'_, AppState>,
    repo_path: String,
    remote: String,
    branch: String,
) -> Result<remote_service::PullResult, AppError> {
    let repos = state.repos.clone();
    let app_clone = app.clone();
    let remote_clone = remote.clone();

    let progress_callback: Option<Arc<dyn Fn(FetchProgress) + Send + Sync>> =
        Some(Arc::new(move |progress: FetchProgress| {
            let _ = app_clone.emit("fetch-progress", serde_json::json!({
                "remote": remote_clone,
                "stage": progress.stage,
                "phase": progress.phase,
                "processed": progress.processed,
                "total": progress.total,
                "bytesProcessed": progress.bytes_processed,
                "bytesTotal": progress.bytes_total
            }));
        }));

    let repos_inner = repos.clone();
    tokio::task::spawn_blocking(move || {
        let  manager = repos_inner
            .lock()
            .map_err(|e| AppError::Credential(e.to_string()))?;
        let mut repo = manager.get_repo(&repo_path)?;
        remote_service::pull(&mut repo, &remote, &branch, progress_callback)
    })
    .await?
}

#[tauri::command]
pub async fn push(
    app: AppHandle,
    state: State<'_, AppState>,
    repo_path: String,
    remote: String,
    branch: String,
) -> Result<remote_service::PushResult, AppError> {
    let repos = state.repos.clone();
    let app_clone = app.clone();
    let remote_clone = remote.clone();
    let branch_clone = branch.clone();

    let progress_callback: Option<Arc<dyn Fn(PushProgress) + Send + Sync>> =
        Some(Arc::new(move |progress: PushProgress| {
            let _ = app_clone.emit("push-progress", serde_json::json!({
                "remote": remote_clone,
                "branch": branch_clone,
                "stage": progress.stage,
                "phase": progress.phase,
                "processed": progress.processed,
                "total": progress.total,
                "bytesProcessed": progress.bytes_processed,
                "bytesTotal": progress.bytes_total
            }));
        }));

    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        remote_service::push(&repo, &remote, &branch, progress_callback)
    })
    .await?
}
