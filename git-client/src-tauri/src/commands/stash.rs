use crate::models::stash::{Credential, StashEntry};
use crate::services::stash_service;
use crate::utils::credential;
use crate::utils::error::AppError;
use crate::AppState;
use tauri::State;

#[tauri::command]
pub async fn stash_save(
    state: State<'_, AppState>,
    repo_path: String,
    message: String,
) -> Result<StashEntry, AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let mut manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let mut repo = manager.get_repo(&repo_path)?;
        stash_service::stash_save(&mut repo, &message)
    })
    .await?
}

#[tauri::command]
pub async fn stash_list(
    state: State<'_, AppState>,
    repo_path: String,
) -> Result<Vec<StashEntry>, AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let mut manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let mut repo = manager.get_repo(&repo_path)?;
        stash_service::stash_list(&mut repo)
    })
    .await?
}

#[tauri::command]
pub async fn stash_pop(
    state: State<'_, AppState>,
    repo_path: String,
    index: usize,
) -> Result<(), AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let mut repo = manager.get_repo(&repo_path)?;
        stash_service::stash_pop(&mut repo, index)
    })
    .await?
}

#[tauri::command]
pub async fn get_credentials(remote: String) -> Result<Credential, AppError> {
    tokio::task::spawn_blocking(move || credential::get_credential(&remote)).await?
}

#[tauri::command]
pub async fn set_credentials(remote: String, cred: Credential) -> Result<(), AppError> {
    tokio::task::spawn_blocking(move || credential::set_credential(&remote, &cred)).await?
}
