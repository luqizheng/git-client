use crate::models::submodule::Submodule;
use crate::services::submodule_service;
use crate::utils::error::AppError;
use crate::AppState;
use tauri::State;

#[tauri::command]
pub async fn list_submodules(
    state: State<'_, AppState>,
    repo_path: String,
) -> Result<Vec<Submodule>, AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        submodule_service::list_submodules(&repo)
    })
    .await?
}

#[tauri::command]
pub async fn init_submodule(
    state: State<'_, AppState>,
    repo_path: String,
    name: String,
) -> Result<(), AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        submodule_service::init_submodule(&repo, &name)
    })
    .await?
}

#[tauri::command]
pub async fn update_submodule(
    state: State<'_, AppState>,
    repo_path: String,
    name: String,
    recursive: bool,
) -> Result<(), AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        submodule_service::update_submodule(&repo, &name, recursive)
    })
    .await?
}
