use crate::models::stash::Credential;
use crate::utils::error::AppError;

fn service_name() -> &'static str {
    "git-client"
}

pub fn get_credential(remote: &str) -> Result<Credential, AppError> {
    let entry = keyring::Entry::new(service_name(), remote)
        .map_err(|e| AppError::Credential(e.to_string()))?;
    let data = entry
        .get_password()
        .map_err(|e| AppError::Credential(e.to_string()))?;
    let cred: Credential = serde_json::from_str(&data)
        .map_err(|e| AppError::Credential(e.to_string()))?;
    Ok(cred)
}

pub fn set_credential(remote: &str, cred: &Credential) -> Result<(), AppError> {
    let entry = keyring::Entry::new(service_name(), remote)
        .map_err(|e| AppError::Credential(e.to_string()))?;
    let data = serde_json::to_string(cred)
        .map_err(|e| AppError::Credential(e.to_string()))?;
    entry
        .set_password(&data)
        .map_err(|e| AppError::Credential(e.to_string()))?;
    Ok(())
}

pub fn delete_credential(remote: &str) -> Result<(), AppError> {
    let entry = keyring::Entry::new(service_name(), remote)
        .map_err(|e| AppError::Credential(e.to_string()))?;
    entry
        .delete_credential()
        .map_err(|e| AppError::Credential(e.to_string()))?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_credential_serialization() {
        let cred = Credential {
            username: "git".to_string(),
            password: Some("token".to_string()),
            ssh_key_path: Some("~/.ssh/id_ed25519".to_string()),
        };
        let json = serde_json::to_string(&cred).unwrap();
        let parsed: Credential = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.username, "git");
    }
}
