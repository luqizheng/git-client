use crate::models::remote::ConflictFile;
use crate::services::merge_service;
use crate::utils::error::AppError;
use crate::AppState;
use tauri::State;

#[tauri::command]
pub async fn cherry_pick(
    state: State<'_, AppState>,
    repo_path: String,
    commit_id: String,
) -> Result<merge_service::CherryPickResult, AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let mut repo = manager.get_repo(&repo_path)?;
        merge_service::cherry_pick(&mut repo, &commit_id)
    })
    .await?
}

#[tauri::command]
pub async fn revert_commit(
    state: State<'_, AppState>,
    repo_path: String,
    commit_id: String,
) -> Result<(), AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let mut repo = manager.get_repo(&repo_path)?;
        merge_service::revert(&mut repo, &commit_id)
    })
    .await?
}

#[tauri::command]
pub async fn get_merge_conflicts(
    state: State<'_, AppState>,
    repo_path: String,
) -> Result<Vec<ConflictFile>, AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        merge_service::get_merge_conflicts(&repo)
    })
    .await?
}

#[tauri::command]
pub async fn mark_resolved(
    state: State<'_, AppState>,
    repo_path: String,
    path: String,
) -> Result<(), AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        merge_service::mark_resolved(&repo, &path)
    })
    .await?
}

#[tauri::command]
pub async fn complete_merge(
    state: State<'_, AppState>,
    repo_path: String,
    message: String,
) -> Result<String, AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        merge_service::complete_merge(&repo, &message)
    })
    .await?
}
