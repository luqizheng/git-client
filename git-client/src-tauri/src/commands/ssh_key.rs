use crate::models::key::{SshAlgorithm, SshKey};
use crate::services::ssh_key_service::SshKeyService;
use crate::utils::error::AppError;
use crate::utils::ssh_agent::SshAgent;
use tauri::AppHandle;

#[tauri::command]
pub async fn list_ssh_keys(app: AppHandle) -> Result<Vec<SshKey>, AppError> {
    SshKeyService::list_keys(&app)
}

#[tauri::command]
pub async fn generate_ssh_key(
    app: AppHandle,
    name: String,
    algorithm: SshAlgorithm,
    comment: Option<String>,
) -> Result<SshKey, AppError> {
    SshKeyService::generate_key(&app, name, algorithm, comment)
}

#[tauri::command]
pub async fn import_ssh_key(
    app: AppHandle,
    source_path: String,
    name: String,
) -> Result<SshKey, AppError> {
    SshKeyService::import_key(&app, source_path, name)
}

#[tauri::command]
pub async fn delete_ssh_key(app: AppHandle, key_id: String) -> Result<(), AppError> {
    SshKeyService::delete_key(&app, key_id)
}

#[tauri::command]
pub async fn get_ssh_public_key(public_key_path: String) -> Result<String, AppError> {
    SshKeyService::get_public_key(public_key_path)
}

#[tauri::command]
pub async fn add_key_to_agent(private_key_path: String) -> Result<(), AppError> {
    SshAgent::add_key(&private_key_path)
}

#[tauri::command]
pub async fn remove_key_from_agent(public_key_path: String) -> Result<(), AppError> {
    SshAgent::remove_key(&public_key_path)
}

#[tauri::command]
pub async fn is_key_in_agent(fingerprint: String) -> Result<bool, AppError> {
    SshAgent::is_key_loaded(&fingerprint)
}
