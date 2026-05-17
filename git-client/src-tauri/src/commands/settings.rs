use crate::utils::error::AppError;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub theme: String,
    pub locale: String,
    pub recent_repos: Vec<String>,
    pub sidebar_width: u32,
    pub sidebar_collapsed: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            theme: "dark".to_string(),
            locale: "zh".to_string(),
            recent_repos: Vec::new(),
            sidebar_width: 240,
            sidebar_collapsed: false,
        }
    }
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct GitConfig {
    pub user_name: Option<String>,
    pub user_email: Option<String>,
}

#[tauri::command]
pub async fn get_git_config(repo_path: Option<String>) -> Result<GitConfig, AppError> {
    tokio::task::spawn_blocking(move || {
        let config = if let Some(path) = repo_path {
            let repo = git2::Repository::open(&path)?;
            repo.config()?
        } else {
            git2::Config::open_default()?
        };

        Ok(GitConfig {
            user_name: config.get_string("user.name").ok(),
            user_email: config.get_string("user.email").ok(),
        })
    })
    .await?
}

#[tauri::command]
pub async fn set_git_config(
    repo_path: Option<String>,
    config: GitConfig,
) -> Result<(), AppError> {
    tokio::task::spawn_blocking(move || {
        let mut git_config = if let Some(path) = repo_path {
            let repo = git2::Repository::open(&path)?;
            repo.config()?
        } else {
            git2::Config::open_default()?
        };

        if let Some(ref name) = config.user_name {
            git_config.set_str("user.name", name)?;
        }
        if let Some(ref email) = config.user_email {
            git_config.set_str("user.email", email)?;
        }

        Ok(())
    })
    .await?
}

fn settings_path(app: &AppHandle) -> Result<PathBuf, AppError> {
    let dir = app.path().app_data_dir()
        .map_err(|e: tauri::Error| AppError::Credential(e.to_string()))?;
    fs::create_dir_all(&dir)?;
    Ok(dir.join("settings.json"))
}

#[tauri::command]
pub async fn load_settings(app: AppHandle) -> Result<AppSettings, AppError> {
    let path = settings_path(&app)?;
    if !path.exists() {
        return Ok(AppSettings::default());
    }
    let data = fs::read_to_string(&path)?;
    let settings: AppSettings = serde_json::from_str(&data)
        .map_err(|e| AppError::Credential(e.to_string()))?;
    Ok(settings)
}

#[tauri::command]
pub async fn save_settings(app: AppHandle, settings: AppSettings) -> Result<(), AppError> {
    let path = settings_path(&app)?;
    let data = serde_json::to_string_pretty(&settings)
        .map_err(|e| AppError::Credential(e.to_string()))?;
    fs::write(&path, data)?;
    Ok(())
}
