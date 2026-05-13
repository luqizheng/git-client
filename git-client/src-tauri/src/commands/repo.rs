use crate::models::repo::RepoState;
use crate::services::repo_service;
use crate::utils::error::AppError;
use crate::AppState;
use tauri::State;

#[tauri::command]
pub async fn open_repo(
    state: State<'_, AppState>,
    path: String,
) -> Result<RepoState, AppError> {
    let repos = state.repos.clone();
    let path_clone = path.clone();
    tokio::task::spawn_blocking(move || {
        let repo_state = repo_service::open_repo(&path_clone)?;
        let mut manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        manager.open(&path_clone)?;
        Ok(repo_state)
    })
    .await?
}

#[tauri::command]
pub async fn init_repo(
    state: State<'_, AppState>,
    path: String,
    bare: bool,
) -> Result<RepoState, AppError> {
    let repos = state.repos.clone();
    let path_clone = path.clone();
    tokio::task::spawn_blocking(move || {
        let repo_state = repo_service::init_repo(&path_clone, bare)?;
        let mut manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        manager.open(&path_clone)?;
        Ok(repo_state)
    })
    .await?
}

#[tauri::command]
pub async fn clone_repo(
    state: State<'_, AppState>,
    url: String,
    path: String,
) -> Result<RepoState, AppError> {
    let repos = state.repos.clone();
    let path_clone = path.clone();
    tokio::task::spawn_blocking(move || {
        let repo_state = repo_service::clone_repo(&url, &path_clone)?;
        let mut manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        manager.open(&path_clone)?;
        Ok(repo_state)
    })
    .await?
}

#[tauri::command]
pub async fn close_repo(
    state: State<'_, AppState>,
    path: String,
) -> Result<(), AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let mut manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        manager.close(&path);
        Ok(())
    })
    .await?
}
