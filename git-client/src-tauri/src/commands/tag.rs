use crate::models::tag::Tag;
use crate::services::tag_service;
use crate::utils::error::AppError;
use crate::AppState;
use tauri::State;

#[tauri::command]
pub async fn list_tags(
    state: State<'_, AppState>,
    repo_path: String,
) -> Result<Vec<Tag>, AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        tag_service::list_tags(&repo)
    })
    .await?
}

#[tauri::command]
pub async fn create_tag(
    state: State<'_, AppState>,
    repo_path: String,
    name: String,
    target: String,
    message: Option<String>,
) -> Result<Tag, AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        tag_service::create_tag(&repo, &name, &target, message.as_deref())
    })
    .await?
}

#[tauri::command]
pub async fn delete_tag(
    state: State<'_, AppState>,
    repo_path: String,
    name: String,
) -> Result<(), AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        tag_service::delete_tag(&repo, &name)
    })
    .await?
}
