use crate::utils::error::AppError;
use crate::AppState;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReflogEntry {
    pub commit_id: String,
    pub message: String,
}

#[tauri::command]
pub async fn get_reflog(
    state: State<'_, AppState>,
    repo_path: String,
) -> Result<Vec<ReflogEntry>, AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        let reflog = repo.reflog("HEAD")?;
        let mut entries = Vec::new();
        for entry in reflog.iter() {
            let oid = entry.id_new();
            entries.push(ReflogEntry {
                commit_id: oid.to_string(),
                message: entry.message().unwrap_or("").to_string(),
            });
            if entries.len() >= 50 {
                break;
            }
        }
        Ok(entries)
    })
    .await?
}

#[tauri::command]
pub async fn undo(
    state: State<'_, AppState>,
    repo_path: String,
) -> Result<(), AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        let reflog = repo.reflog("HEAD")?;
        if reflog.len() < 2 {
            return Err(AppError::Credential("Nothing to undo".to_string()));
        }
        let prev_id = reflog
            .get(1)
            .ok_or(AppError::Credential("No previous reflog entry".to_string()))?
            .id_new();
        let commit = repo.find_commit(prev_id)?;
        let obj = commit.as_object();
        repo.reset(obj, git2::ResetType::Mixed, None)?;
        Ok(())
    })
    .await?
}

#[tauri::command]
pub async fn redo(
    state: State<'_, AppState>,
    repo_path: String,
    current_index: usize,
) -> Result<(), AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        let reflog = repo.reflog("HEAD")?;
        let idx = if current_index > 0 {
            current_index.saturating_sub(1)
        } else {
            0
        };
        let entry = reflog
            .get(idx)
            .ok_or(AppError::Credential("No redo entry".to_string()))?;
        let id = entry.id_new();
        let commit = repo.find_commit(id)?;
        let obj = commit.as_object();
        repo.reset(obj, git2::ResetType::Mixed, None)?;
        Ok(())
    })
    .await?
}

#[tauri::command]
pub async fn discard_file(
    state: State<'_, AppState>,
    repo_path: String,
    file_path: String,
) -> Result<(), AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        let mut checkout_opts = git2::build::CheckoutBuilder::new();
        checkout_opts.path(file_path.as_str());
        checkout_opts.force();
        repo.checkout_head(Some(&mut checkout_opts))?;
        Ok(())
    })
    .await?
}

#[tauri::command]
pub async fn discard_all(
    state: State<'_, AppState>,
    repo_path: String,
) -> Result<(), AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        let mut checkout_opts = git2::build::CheckoutBuilder::new();
        checkout_opts.force();
        repo.checkout_head(Some(&mut checkout_opts))?;
        Ok(())
    })
    .await?
}
