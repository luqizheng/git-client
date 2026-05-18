use crate::models::blame::BlameResult;
use crate::services::blame_service;
use crate::utils::error::AppError;
use crate::AppState;
use tauri::State;

#[tauri::command]
pub async fn blame_file(
    state: State<'_, AppState>,
    repo_path: String,
    file_path: String,
    commit_id: Option<String>,
) -> Result<BlameResult, AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        blame_service::blame_file(&repo, &file_path, commit_id.as_deref())
    })
    .await?
}
