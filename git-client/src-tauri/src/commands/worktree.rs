use crate::models::worktree::Worktree;
use crate::services::worktree_service;
use crate::utils::error::AppError;
use crate::AppState;
use tauri::State;

#[tauri::command]
pub async fn list_worktrees(
    state: State<'_, AppState>,
    repo_path: String,
) -> Result<Vec<Worktree>, AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        worktree_service::list_worktrees(&repo)
    })
    .await?
}

#[tauri::command]
pub async fn create_worktree(
    state: State<'_, AppState>,
    repo_path: String,
    branch: String,
    path: String,
) -> Result<Worktree, AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        worktree_service::create_worktree(&repo, &branch, &path)
    })
    .await?
}

#[tauri::command]
pub async fn delete_worktree(
    state: State<'_, AppState>,
    repo_path: String,
    path: String,
) -> Result<(), AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        worktree_service::delete_worktree(&repo, &path)
    })
    .await?
}
