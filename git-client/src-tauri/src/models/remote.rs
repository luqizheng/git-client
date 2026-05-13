use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct RemoteInfo {
    pub name: String,
    pub url: String,
    pub push_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ConflictFile {
    pub path: String,
    pub ours_modified: bool,
    pub theirs_modified: bool,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_remote_info_roundtrip() {
        let remote = RemoteInfo {
            name: "origin".to_string(),
            url: "https://github.com/user/repo.git".to_string(),
            push_url: None,
        };
        let json = serde_json::to_string(&remote).unwrap();
        let parsed: RemoteInfo = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed, remote);
    }

    #[test]
    fn test_conflict_file_roundtrip() {
        let cf = ConflictFile {
            path: "src/main.rs".to_string(),
            ours_modified: true,
            theirs_modified: true,
        };
        let json = serde_json::to_string(&cf).unwrap();
        let parsed: ConflictFile = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed, cf);
    }
}
