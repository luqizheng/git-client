use crate::models::branch::Branch;
use crate::services::branch_service::{self, RebaseInfo, RebaseOperation};
use crate::utils::error::AppError;
use crate::AppState;
use tauri::State;

#[tauri::command]
pub async fn list_branches(
    state: State<'_, AppState>,
    repo_path: String,
) -> Result<Vec<Branch>, AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        branch_service::list_branches(&repo)
    })
    .await?
}

#[tauri::command]
pub async fn create_branch(
    state: State<'_, AppState>,
    repo_path: String,
    name: String,
    checkout: bool,
) -> Result<Branch, AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        branch_service::create_branch(&repo, &name, checkout)
    })
    .await?
}

#[tauri::command]
pub async fn switch_branch(
    state: State<'_, AppState>,
    repo_path: String,
    name: String,
) -> Result<(), AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        branch_service::switch_branch(&repo, &name)
    })
    .await?
}

#[tauri::command]
pub async fn delete_branch(
    state: State<'_, AppState>,
    repo_path: String,
    name: String,
    force: bool,
) -> Result<(), AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        branch_service::delete_branch(&repo, &name, force)
    })
    .await?
}

#[tauri::command]
pub async fn rebase_branch(
    state: State<'_, AppState>,
    repo_path: String,
    upstream: String,
    branch: Option<String>,
) -> Result<(), AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let mut repo = manager.get_repo(&repo_path)?;
        branch_service::rebase_with_ops(&mut repo, &upstream, branch.as_deref())
    })
    .await?
}

#[tauri::command]
pub async fn compare_branches(
    state: State<'_, AppState>,
    repo_path: String,
    base: String,
    compare: String,
) -> Result<branch_service::BranchCompareResult, AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        branch_service::compare_branches(&repo, &base, &compare)
    })
    .await?
}

#[tauri::command]
pub async fn get_rebase_in_progress(
    state: State<'_, AppState>,
    repo_path: String,
) -> Result<Option<RebaseInfo>, AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        branch_service::get_rebase_in_progress(&repo)
    })
    .await?
}

#[tauri::command]
pub async fn get_rebase_operations(
    state: State<'_, AppState>,
    repo_path: String,
) -> Result<Vec<RebaseOperation>, AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        branch_service::get_rebase_operations_list(&repo)
    })
    .await?
}

#[tauri::command]
pub async fn rebase_continue(
    state: State<'_, AppState>,
    repo_path: String,
) -> Result<(), AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let mut repo = manager.get_repo(&repo_path)?;
        branch_service::rebase_continue(&mut repo)
    })
    .await?
}

#[tauri::command]
pub async fn rebase_abort(
    state: State<'_, AppState>,
    repo_path: String,
) -> Result<(), AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let mut repo = manager.get_repo(&repo_path)?;
        branch_service::rebase_abort(&mut repo)
    })
    .await?
}
