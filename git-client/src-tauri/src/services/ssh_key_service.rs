use crate::models::key::{SshAlgorithm, SshKey, SshKeyMetadata};
use crate::utils::error::AppError;
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use tauri::{AppHandle, Manager};
use uuid::Uuid;

pub struct SshKeyService;

impl SshKeyService {
    pub fn get_ssh_dir() -> Result<PathBuf, AppError> {
        let home = dirs::home_dir()
            .ok_or_else(|| AppError::Credential("Cannot find home directory".into()))?;
        Ok(home.join(".ssh"))
    }

    pub fn get_metadata_path(app: &AppHandle) -> Result<PathBuf, AppError> {
        let dir = app
            .path()
            .app_data_dir()
            .map_err(|e| AppError::Credential(e.to_string()))?;
        fs::create_dir_all(&dir)?;
        Ok(dir.join("ssh_keys.json"))
    }

    pub fn load_metadata(app: &AppHandle) -> Result<SshKeyMetadata, AppError> {
        let path = Self::get_metadata_path(app)?;
        if !path.exists() {
            return Ok(SshKeyMetadata {
                version: 1,
                keys: Vec::new(),
                default_key_id: None,
            });
        }
        let data = fs::read_to_string(&path)?;
        serde_json::from_str(&data).map_err(|e| AppError::Credential(e.to_string()))
    }

    pub fn save_metadata(app: &AppHandle, metadata: &SshKeyMetadata) -> Result<(), AppError> {
        let path = Self::get_metadata_path(app)?;
        let data =
            serde_json::to_string_pretty(metadata).map_err(|e| AppError::Credential(e.to_string()))?;
        fs::write(&path, data).map_err(|e| AppError::Credential(e.to_string()))
    }

    pub fn list_keys(app: &AppHandle) -> Result<Vec<SshKey>, AppError> {
        let metadata = Self::load_metadata(app)?;
        Ok(metadata.keys)
    }

    pub fn generate_key(
        app: &AppHandle,
        name: String,
        algorithm: SshAlgorithm,
        comment: Option<String>,
    ) -> Result<SshKey, AppError> {
        let ssh_dir = Self::get_ssh_dir()?;
        fs::create_dir_all(&ssh_dir)?;

        let timestamp = chrono::Utc::now().format("%Y%m%d%H%M%S");
        let algo_str = match algorithm {
            SshAlgorithm::Rsa => "rsa",
            SshAlgorithm::Ed25519 => "ed25519",
            SshAlgorithm::Ecdsa => "ecdsa",
        };
        let filename = format!("id_{}_{}", algo_str, timestamp);
        let private_key_path = ssh_dir.join(&filename);
        let public_key_path = ssh_dir.join(format!("{}.pub", filename));

        let mut cmd = Command::new("ssh-keygen");
        cmd.arg("-t").arg(algo_str);
        if matches!(algorithm, SshAlgorithm::Rsa) {
            cmd.arg("-b").arg("4096");
        }
        cmd.arg("-f").arg(&private_key_path);
        cmd.arg("-N").arg("");
        if let Some(ref c) = comment {
            cmd.arg("-C").arg(c);
        }

        let output = cmd
            .output()
            .map_err(|e| AppError::Credential(format!("Failed to run ssh-keygen: {}", e)))?;

        if !output.status.success() {
            return Err(AppError::Credential(
                String::from_utf8_lossy(&output.stderr).to_string(),
            ));
        }

        let fingerprint = Self::get_key_fingerprint(&public_key_path)?;
        let id = Uuid::new_v4().to_string();
        let created_at = chrono::Utc::now().to_rfc3339();

        let key = SshKey {
            id,
            name,
            private_key_path: private_key_path.to_string_lossy().to_string(),
            public_key_path: public_key_path.to_string_lossy().to_string(),
            fingerprint,
            algorithm,
            created_at,
            comment,
        };

        let mut metadata = Self::load_metadata(app)?;
        metadata.keys.push(key.clone());
        if metadata.default_key_id.is_none() {
            metadata.default_key_id = Some(key.id.clone());
        }
        Self::save_metadata(app, &metadata)?;

        Ok(key)
    }

    fn get_key_fingerprint(path: &PathBuf) -> Result<String, AppError> {
        let output = Command::new("ssh-keygen")
            .arg("-l")
            .arg("-f")
            .arg(path)
            .output()
            .map_err(|e| AppError::Credential(format!("Failed to run ssh-keygen: {}", e)))?;

        if !output.status.success() {
            return Err(AppError::Credential(
                String::from_utf8_lossy(&output.stderr).to_string(),
            ));
        }

        let output_str = String::from_utf8_lossy(&output.stdout);
        let parts: Vec<&str> = output_str.split_whitespace().collect();
        if parts.len() >= 2 {
            Ok(parts[1].to_string())
        } else {
            Ok(output_str.trim().to_string())
        }
    }

    pub fn import_key(
        app: &AppHandle,
        source_path: String,
        name: String,
    ) -> Result<SshKey, AppError> {
        let ssh_dir = Self::get_ssh_dir()?;
        fs::create_dir_all(&ssh_dir)?;

        let source = PathBuf::from(&source_path);
        if !source.exists() {
            return Err(AppError::Credential(
                "Source key file does not exist".into(),
            ));
        }

        let filename = source
            .file_name()
            .ok_or_else(|| AppError::Credential("Invalid key file name".into()))?;
        let filename_str = filename.to_string_lossy();

        let dest_private = ssh_dir.join(&*filename_str);
        fs::copy(&source, &dest_private)?;

        let public_key_path = source.with_extension("");
        let fingerprint = if public_key_path.exists() {
            Self::get_key_fingerprint(&public_key_path)?
        } else {
            Self::get_key_fingerprint(&dest_private)?
        };

        let algorithm = if filename_str.contains("ed25519") {
            SshAlgorithm::Ed25519
        } else if filename_str.contains("rsa") || filename_str.contains("id_rsa") {
            SshAlgorithm::Rsa
        } else {
            SshAlgorithm::Ecdsa
        };

        let id = Uuid::new_v4().to_string();
        let created_at = chrono::Utc::now().to_rfc3339();

        let key = SshKey {
            id,
            name,
            private_key_path: dest_private.to_string_lossy().to_string(),
            public_key_path: public_key_path.to_string_lossy().to_string(),
            fingerprint,
            algorithm,
            created_at,
            comment: None,
        };

        let mut metadata = Self::load_metadata(app)?;
        metadata.keys.push(key.clone());
        Self::save_metadata(app, &metadata)?;

        Ok(key)
    }

    pub fn delete_key(app: &AppHandle, key_id: String) -> Result<(), AppError> {
        let mut metadata = Self::load_metadata(app)?;
        let key = metadata
            .keys
            .iter()
            .find(|k| k.id == key_id)
            .ok_or_else(|| AppError::Credential("Key not found".into()))?;

        let private_path = PathBuf::from(&key.private_key_path);
        let public_path = PathBuf::from(&key.public_key_path);

        if private_path.exists() {
            fs::remove_file(&private_path)?;
        }
        if public_path.exists() {
            fs::remove_file(&public_path)?;
        }

        metadata.keys.retain(|k| k.id != key_id);
        if metadata.default_key_id.as_ref() == Some(&key_id) {
            metadata.default_key_id = metadata.keys.first().map(|k| k.id.clone());
        }
        Self::save_metadata(app, &metadata)?;

        Ok(())
    }

    pub fn get_public_key(key_id: String) -> Result<String, AppError> {
        let public_path = PathBuf::from(&key_id);
        if !public_path.exists() {
            return Err(AppError::Credential("Public key file not found".into()));
        }
        fs::read_to_string(&public_path).map_err(|e| AppError::Credential(e.to_string()))
    }
}
