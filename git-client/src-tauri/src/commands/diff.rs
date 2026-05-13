use crate::models::diff::FileDiff;
use crate::services::diff_service;
use crate::services::merge_service;
use crate::utils::error::AppError;
use crate::AppState;
use tauri::State;

#[tauri::command]
pub async fn get_diff(
    state: State<'_, AppState>,
    repo_path: String,
    commit_id: String,
) -> Result<Vec<FileDiff>, AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        diff_service::get_commit_diff(&repo, &commit_id)
    })
    .await?
}

#[tauri::command]
pub async fn get_working_diff(
    state: State<'_, AppState>,
    repo_path: String,
) -> Result<Vec<FileDiff>, AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        diff_service::get_working_diff(&repo)
    })
    .await?
}

#[tauri::command]
pub async fn get_staged_diff(
    state: State<'_, AppState>,
    repo_path: String,
) -> Result<Vec<FileDiff>, AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        diff_service::get_staged_diff(&repo)
    })
    .await?
}

#[tauri::command]
pub async fn stage_files(
    state: State<'_, AppState>,
    repo_path: String,
    paths: Vec<String>,
) -> Result<(), AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        diff_service::stage_files(&repo, &paths)
    })
    .await?
}

#[tauri::command]
pub async fn unstage_files(
    state: State<'_, AppState>,
    repo_path: String,
    paths: Vec<String>,
) -> Result<(), AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        diff_service::unstage_files(&repo, &paths)
    })
    .await?
}

#[tauri::command]
pub async fn resolve_conflict(
    state: State<'_, AppState>,
    repo_path: String,
    path: String,
    content: String,
) -> Result<(), AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        merge_service::resolve_conflict(&repo, &path, &content)
    })
    .await?
}
