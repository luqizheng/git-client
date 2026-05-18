use crate::utils::error::AppError;
use std::process::Command;

pub struct SshAgent;

impl SshAgent {
    pub fn is_agent_running() -> bool {
        std::env::var("SSH_AUTH_SOCK").is_ok()
    }

    pub fn add_key(path: &str) -> Result<(), AppError> {
        let output = Command::new("ssh-add")
            .arg(path)
            .output()
            .map_err(|e| AppError::Credential(format!("Failed to run ssh-add: {}", e)))?;

        if !output.status.success() {
            return Err(AppError::Credential(
                String::from_utf8_lossy(&output.stderr).to_string(),
            ));
        }
        Ok(())
    }

    pub fn remove_key(path: &str) -> Result<(), AppError> {
        let output = Command::new("ssh-add")
            .arg("-d")
            .arg(path)
            .output()
            .map_err(|e| AppError::Credential(format!("Failed to run ssh-add: {}", e)))?;

        if !output.status.success() {
            return Err(AppError::Credential(
                String::from_utf8_lossy(&output.stderr).to_string(),
            ));
        }
        Ok(())
    }

    pub fn list_loaded_keys() -> Result<Vec<String>, AppError> {
        let output = Command::new("ssh-add")
            .arg("-l")
            .output()
            .map_err(|e| AppError::Credential(format!("Failed to run ssh-add: {}", e)))?;

        let output_str = String::from_utf8_lossy(&output.stdout);
        let keys: Vec<String> = output_str.lines().map(|l| l.to_string()).collect();
        Ok(keys)
    }

    pub fn is_key_loaded(fingerprint: &str) -> Result<bool, AppError> {
        let loaded_keys = Self::list_loaded_keys()?;
        Ok(loaded_keys.iter().any(|k| k.contains(fingerprint)))
    }
}
