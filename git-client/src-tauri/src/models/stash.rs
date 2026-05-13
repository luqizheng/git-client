use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct StashEntry {
    pub index: u32,
    pub message: String,
    pub commit_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Credential {
    pub username: String,
    pub password: Option<String>,
    pub ssh_key_path: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_stash_entry_roundtrip() {
        let entry = StashEntry {
            index: 0,
            message: "WIP on main".to_string(),
            commit_id: "def456".to_string(),
        };
        let json = serde_json::to_string(&entry).unwrap();
        let parsed: StashEntry = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed, entry);
    }

    #[test]
    fn test_credential_serialization() {
        let cred = Credential {
            username: "git".to_string(),
            password: Some("token123".to_string()),
            ssh_key_path: Some("~/.ssh/id_rsa".to_string()),
        };
        let json = serde_json::to_string(&cred).unwrap();
        let parsed: Credential = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed, cred);
    }
}
