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
    pub ours_content: Option<String>,
    pub theirs_content: Option<String>,
    pub base_content: Option<String>,
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
            ours_content: Some("ours content".to_string()),
            theirs_content: Some("theirs content".to_string()),
            base_content: Some("base content".to_string()),
        };
        let json = serde_json::to_string(&cf).unwrap();
        let parsed: ConflictFile = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed, cf);
    }
}
