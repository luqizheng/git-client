use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct RepoState {
    pub path: String,
    pub head_branch: Option<String>,
    pub head_commit_id: Option<String>,
    pub is_bare: bool,
    pub is_empty: bool,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_repo_state_serialize() {
        let state = RepoState {
            path: "/tmp/repo".to_string(),
            head_branch: Some("main".to_string()),
            head_commit_id: Some("abc123".to_string()),
            is_bare: false,
            is_empty: false,
        };
        let json = serde_json::to_string(&state).unwrap();
        let parsed: RepoState = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed, state);
    }
}
