use crate::models::key::RepoKeyConfig;
use crate::utils::error::AppError;
use git2::Repository;
use std::collections::hash_map::DefaultHasher;
use std::fs;
use std::hash::{Hash, Hasher};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

fn get_repo_key_configs_path(app: &AppHandle) -> Result<PathBuf, AppError> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| AppError::Credential(e.to_string()))?;
    fs::create_dir_all(&dir)?;
    Ok(dir.join("repo_key_configs.json"))
}

fn load_configs(app: &AppHandle) -> Result<Vec<RepoKeyConfig>, AppError> {
    let path = get_repo_key_configs_path(app)?;
    if !path.exists() {
        return Ok(Vec::new());
    }
    let data = fs::read_to_string(&path)?;
    serde_json::from_str(&data).map_err(|e| AppError::Credential(e.to_string()))
}

fn save_configs(app: &AppHandle, configs: &[RepoKeyConfig]) -> Result<(), AppError> {
    let path = get_repo_key_configs_path(app)?;
    let data =
        serde_json::to_string_pretty(configs).map_err(|e| AppError::Credential(e.to_string()))?;
    fs::write(&path, data).map_err(|e| AppError::Credential(e.to_string()))
}

fn generate_repo_id(repo_path: &str) -> Result<String, AppError> {
    let repo = Repository::open(repo_path)
        .map_err(|e| AppError::Credential(format!("Failed to open repo: {}", e)))?;

    if let Ok(remote) = repo.find_remote("origin") {
        let url = remote.url().unwrap_or("").to_string();
        let head = repo
            .head()
            .map(|h| h.name().unwrap_or("").to_string())
            .unwrap_or_default();
        if !url.is_empty() {
            return Ok(format!("{}#{}", url, head));
        }
    }

    let mut hasher = DefaultHasher::new();
    repo_path.hash(&mut hasher);
    Ok(format!("local:{:x}", hasher.finish()))
}

#[tauri::command]
pub async fn get_repo_key_config(app: AppHandle, repo_path: String) -> Result<RepoKeyConfig, AppError> {
    let repo_id = generate_repo_id(&repo_path)?;
    let configs = load_configs(&app)?;

    Ok(configs
        .into_iter()
        .find(|c| c.repo_id == repo_id)
        .unwrap_or_else(|| RepoKeyConfig {
            repo_id,
            repo_path,
            ssh_key_id: None,
            gpg_key_id: None,
            use_ssh_agent: false,
        }))
}

#[tauri::command]
pub async fn set_repo_ssh_key(
    app: AppHandle,
    repo_path: String,
    key_id: Option<String>,
) -> Result<(), AppError> {
    let repo_id = generate_repo_id(&repo_path)?;
    let mut configs = load_configs(&app)?;

    if let Some(config) = configs.iter_mut().find(|c| c.repo_id == repo_id) {
        config.ssh_key_id = key_id;
    } else {
        configs.push(RepoKeyConfig {
            repo_id,
            repo_path,
            ssh_key_id: key_id,
            gpg_key_id: None,
            use_ssh_agent: false,
        });
    }

    save_configs(&app, &configs)
}

#[tauri::command]
pub async fn set_repo_gpg_key(
    app: AppHandle,
    repo_path: String,
    key_id: Option<String>,
) -> Result<(), AppError> {
    let repo_id = generate_repo_id(&repo_path)?;
    let mut configs = load_configs(&app)?;

    if let Some(config) = configs.iter_mut().find(|c| c.repo_id == repo_id) {
        config.gpg_key_id = key_id;
    } else {
        configs.push(RepoKeyConfig {
            repo_id,
            repo_path,
            ssh_key_id: None,
            gpg_key_id: key_id,
            use_ssh_agent: false,
        });
    }

    save_configs(&app, &configs)
}
