use crate::services::hook_service;
use crate::utils::error::AppError;
use crate::AppState;
use tauri::State;

#[tauri::command]
pub async fn list_hooks(
    state: State<'_, AppState>,
    repo_path: String,
) -> Result<Vec<hook_service::HookInfo>, AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        hook_service::list_hooks(&repo)
    })
    .await?
}

#[tauri::command]
pub async fn get_hook_content(
    state: State<'_, AppState>,
    repo_path: String,
    hook_name: String,
) -> Result<String, AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        hook_service::get_hook_content(&repo, &hook_name)
    })
    .await?
}

#[tauri::command]
pub async fn set_hook_content(
    state: State<'_, AppState>,
    repo_path: String,
    hook_name: String,
    content: String,
) -> Result<(), AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        hook_service::set_hook_content(&repo, &hook_name, &content)
    })
    .await?
}