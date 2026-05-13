use crate::services::reset_service::ResetMode;
use crate::utils::error::AppError;
use crate::AppState;
use std::path::PathBuf;
use tauri::State;

#[tauri::command]
pub async fn reset_commit(
    state: State<'_, AppState>,
    repo_path: String,
    commit_id: String,
    mode: ResetMode,
) -> Result<(), AppError> {
    let mut repos = state.repos.lock()?;
    let repo = repos.handles.get_mut(&PathBuf::from(&repo_path)).ok_or(AppError::NotARepo(repo_path))?;
    crate::services::reset_service::reset(&repo.path, &commit_id, mode)
}
