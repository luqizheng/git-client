use crate::models::remote::RemoteInfo;
use crate::services::remote_service;
use crate::utils::error::AppError;
use crate::AppState;
use tauri::State;

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
    state: State<'_, AppState>,
    repo_path: String,
    remote: String,
) -> Result<remote_service::FetchResult, AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        remote_service::fetch(&repo, &remote)
    })
    .await?
}

#[tauri::command]
pub async fn pull(
    state: State<'_, AppState>,
    repo_path: String,
    remote: String,
    branch: String,
) -> Result<remote_service::PullResult, AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let mut manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let mut repo = manager.get_repo(&repo_path)?;
        remote_service::pull(&mut repo, &remote, &branch)
    })
    .await?
}

#[tauri::command]
pub async fn push(
    state: State<'_, AppState>,
    repo_path: String,
    remote: String,
    branch: String,
) -> Result<remote_service::PushResult, AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        remote_service::push(&repo, &remote, &branch)
    })
    .await?
}
