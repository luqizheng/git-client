use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum SshAlgorithm {
    Rsa,
    Ed25519,
    Ecdsa,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SshKey {
    pub id: String,
    pub name: String,
    pub private_key_path: String,
    pub public_key_path: String,
    pub fingerprint: String,
    pub algorithm: SshAlgorithm,
    pub created_at: String,
    pub comment: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GpgSubkey {
    pub id: String,
    pub fingerprint: String,
    pub algorithm: String,
    pub length: u32,
    pub expires_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GpgKey {
    pub id: String,
    pub fingerprint: String,
    pub user_ids: Vec<String>,
    pub created_at: String,
    pub expires_at: Option<String>,
    pub algorithm: String,
    pub length: u32,
    pub subkeys: Vec<GpgSubkey>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RepoKeyConfig {
    pub repo_id: String,
    pub repo_path: String,
    pub ssh_key_id: Option<String>,
    pub gpg_key_id: Option<String>,
    pub use_ssh_agent: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SshKeyMetadata {
    pub version: u32,
    pub keys: Vec<SshKey>,
    pub default_key_id: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ssh_key_serialization() {
        let key = SshKey {
            id: "test-id".to_string(),
            name: "test-key".to_string(),
            private_key_path: "/home/user/.ssh/id_ed25519".to_string(),
            public_key_path: "/home/user/.ssh/id_ed25519.pub".to_string(),
            fingerprint: "SHA256:abc123".to_string(),
            algorithm: SshAlgorithm::Ed25519,
            created_at: "2025-01-15T10:30:00Z".to_string(),
            comment: Some("test@example.com".to_string()),
        };
        let json = serde_json::to_string(&key).unwrap();
        let parsed: SshKey = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.id, "test-id");
        assert_eq!(parsed.algorithm, SshAlgorithm::Ed25519);
    }

    #[test]
    fn test_gpg_key_serialization() {
        let key = GpgKey {
            id: "ABC123DEF".to_string(),
            fingerprint: "1234567890ABCDEF".to_string(),
            user_ids: vec!["test@example.com".to_string()],
            created_at: "2025-01-15T10:30:00Z".to_string(),
            expires_at: None,
            algorithm: "EdDSA".to_string(),
            length: 256,
            subkeys: vec![],
        };
        let json = serde_json::to_string(&key).unwrap();
        let parsed: GpgKey = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.id, "ABC123DEF");
    }

    #[test]
    fn test_repo_key_config_serialization() {
        let config = RepoKeyConfig {
            repo_id: "git@github.com:user/repo.git#main".to_string(),
            repo_path: "/home/user/projects/repo".to_string(),
            ssh_key_id: Some("uuid-1".to_string()),
            gpg_key_id: Some("ABC123DEF".to_string()),
            use_ssh_agent: false,
        };
        let json = serde_json::to_string(&config).unwrap();
        let parsed: RepoKeyConfig = serde_json::from_str(&json).unwrap();
        assert!(parsed.ssh_key_id.is_some());
        assert!(parsed.gpg_key_id.is_some());
    }
}
