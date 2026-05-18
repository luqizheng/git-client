use crate::models::key::GpgKey;
use crate::services::gpg_key_service::GpgKeyService;
use crate::utils::error::AppError;

#[tauri::command]
pub async fn list_gpg_keys() -> Result<Vec<GpgKey>, AppError> {
    if !GpgKeyService::is_gpg_available() {
        return Err(AppError::Credential("GPG is not installed".into()));
    }
    GpgKeyService::list_keys()
}

#[tauri::command]
pub async fn export_gpg_public_key(key_id: String) -> Result<String, AppError> {
    if !GpgKeyService::is_gpg_available() {
        return Err(AppError::Credential("GPG is not installed".into()));
    }
    GpgKeyService::export_public_key(&key_id)
}

#[tauri::command]
pub async fn import_gpg_key(key_data: String) -> Result<(), AppError> {
    if !GpgKeyService::is_gpg_available() {
        return Err(AppError::Credential("GPG is not installed".into()));
    }
    GpgKeyService::import_key(&key_data)
}

#[tauri::command]
pub async fn delete_gpg_key(key_id: String) -> Result<(), AppError> {
    if !GpgKeyService::is_gpg_available() {
        return Err(AppError::Credential("GPG is not installed".into()));
    }
    GpgKeyService::delete_key(&key_id)
}
