use crate::models::key::{GpgKey, GpgSubkey};
use crate::utils::error::AppError;
use std::process::Command;

pub struct GpgKeyService;

impl GpgKeyService {
    pub fn is_gpg_available() -> bool {
        Command::new("gpg")
            .arg("--version")
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }

    pub fn list_keys() -> Result<Vec<GpgKey>, AppError> {
        let output = Command::new("gpg")
            .arg("--list-secret-keys")
            .arg("--with-colons")
            .output()
            .map_err(|e| AppError::Credential(format!("Failed to run gpg: {}", e)))?;

        if !output.status.success() {
            return Err(AppError::Credential(
                String::from_utf8_lossy(&output.stderr).to_string(),
            ));
        }

        let output_str = String::from_utf8_lossy(&output.stdout);
        Self::parse_gpg_output(&output_str)
    }

    fn parse_gpg_output(output: &str) -> Result<Vec<GpgKey>, AppError> {
        let mut keys: Vec<GpgKey> = Vec::new();
        let mut current_key: Option<GpgKey> = None;
        let mut current_subkeys: Vec<GpgSubkey> = Vec::new();

        for line in output.lines() {
            let parts: Vec<&str> = line.split(':').collect();
            if parts.len() < 2 {
                continue;
            }

            match parts[0] {
                "sec" | "ssb" => {
                    if let Some(key) = current_key.take() {
                        let mut key_clone = key;
                        key_clone.subkeys = current_subkeys.clone();
                        keys.push(key_clone);
                    }
                    current_subkeys.clear();

                    if parts[0] == "sec" && parts.len() >= 10 {
                        let key_id = parts[4].to_string();
                        let fingerprint = parts[9].to_string();
                        let algorithm = Self::parse_algorithm(parts[1]);
                        let length: u32 = parts[2].parse().unwrap_or(0);
                        let created_at = Self::parse_date(parts[5]);
                        let expires_at = if parts[6].is_empty() {
                            None
                        } else {
                            Some(Self::parse_date(parts[6]))
                        };

                        current_key = Some(GpgKey {
                            id: key_id,
                            fingerprint,
                            user_ids: Vec::new(),
                            created_at,
                            expires_at,
                            algorithm,
                            length,
                            subkeys: Vec::new(),
                        });
                    }
                }
                "uid" => {
                    if let Some(ref mut key) = current_key {
                        if parts.len() > 9 {
                            key.user_ids.push(parts[9].to_string());
                        }
                    }
                }
                "sub" => {
                    if parts.len() >= 10 {
                        current_subkeys.push(GpgSubkey {
                            id: parts[4].to_string(),
                            fingerprint: parts[9].to_string(),
                            algorithm: Self::parse_algorithm(parts[1]),
                            length: parts[2].parse().unwrap_or(0),
                            expires_at: if parts[6].is_empty() {
                                None
                            } else {
                                Some(Self::parse_date(parts[6]))
                            },
                        });
                    }
                }
                _ => {}
            }
        }

        if let Some(key) = current_key {
            let mut key_clone = key;
            key_clone.subkeys = current_subkeys;
            keys.push(key_clone);
        }

        Ok(keys)
    }

    fn parse_algorithm(algo_code: &str) -> String {
        match algo_code {
            "1" => "RSA".to_string(),
            "17" => "DSA".to_string(),
            "16" => "ElGamal".to_string(),
            "19" => "ECDSA".to_string(),
            "22" => "EdDSA".to_string(),
            _ => algo_code.to_string(),
        }
    }

    fn parse_date(date_str: &str) -> String {
        if let Ok(timestamp) = date_str.parse::<i64>() {
            chrono::DateTime::from_timestamp(timestamp, 0)
                .map(|dt| dt.to_rfc3339())
                .unwrap_or_else(|| date_str.to_string())
        } else {
            date_str.to_string()
        }
    }

    pub fn export_public_key(key_id: &str) -> Result<String, AppError> {
        let output = Command::new("gpg")
            .arg("--armor")
            .arg("--export")
            .arg(key_id)
            .output()
            .map_err(|e| AppError::Credential(format!("Failed to run gpg: {}", e)))?;

        if !output.status.success() {
            return Err(AppError::Credential(
                String::from_utf8_lossy(&output.stderr).to_string(),
            ));
        }

        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    }

    pub fn import_key(key_data: &str) -> Result<(), AppError> {
        use std::io::Write;
        let mut child = Command::new("gpg")
            .arg("--import")
            .stdin(std::process::Stdio::piped())
            .spawn()
            .map_err(|e| AppError::Credential(format!("Failed to spawn gpg: {}", e)))?;

        if let Some(ref mut stdin) = child.stdin {
            stdin
                .write_all(key_data.as_bytes())
                .map_err(|e| AppError::Credential(format!("Failed to write to gpg: {}", e)))?;
        }

        let output = child
            .wait_with_output()
            .map_err(|e| AppError::Credential(format!("Failed to wait for gpg: {}", e)))?;

        if !output.status.success() {
            return Err(AppError::Credential(
                String::from_utf8_lossy(&output.stderr).to_string(),
            ));
        }

        Ok(())
    }

    pub fn delete_key(key_id: &str) -> Result<(), AppError> {
        let output = Command::new("gpg")
            .arg("--delete-secret-keys")
            .arg(key_id)
            .output()
            .map_err(|e| AppError::Credential(format!("Failed to run gpg: {}", e)))?;

        if !output.status.success() {
            return Err(AppError::Credential(
                String::from_utf8_lossy(&output.stderr).to_string(),
            ));
        }

        let output = Command::new("gpg")
            .arg("--delete-keys")
            .arg(key_id)
            .output()
            .map_err(|e| AppError::Credential(format!("Failed to run gpg: {}", e)))?;

        if !output.status.success() {
            return Err(AppError::Credential(
                String::from_utf8_lossy(&output.stderr).to_string(),
            ));
        }

        Ok(())
    }
}
