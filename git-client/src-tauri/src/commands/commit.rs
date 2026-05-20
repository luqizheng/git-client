use crate::models::commit::Commit;
use crate::models::commit::SearchFilter;
use crate::services::commit_service;
use crate::utils::error::AppError;
use crate::AppState;
use tauri::State;

#[tauri::command]
pub async fn get_log(
    state: State<'_, AppState>,
    repo_path: String,
    limit: u32,
    after: Option<String>,
) -> Result<Vec<Commit>, AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        commit_service::log(&repo, limit, after.as_deref())
    })
    .await?
}

#[tauri::command]
pub async fn commit(
    state: State<'_, AppState>,
    repo_path: String,
    message: String,
    amend: bool,
    gpg_sign: Option<bool>,
) -> Result<Commit, AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let mut repo = manager.get_repo(&repo_path)?;
        commit_service::create_commit(&mut repo, &message, amend, gpg_sign)
    })
    .await?
}

#[tauri::command]
pub async fn search_commits(
    state: State<'_, AppState>,
    repo_path: String,
    query: String,
    filter: SearchFilter,
    limit: Option<u32>,
) -> Result<Vec<Commit>, AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        commit_service::search(&repo, &query, &filter, limit.unwrap_or(50))
    })
    .await?
}
