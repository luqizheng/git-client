use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Branch {
    pub name: String,
    pub is_remote: bool,
    pub is_head: bool,
    pub target_commit_id: String,
    pub upstream: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_branch_serialize() {
        let branch = Branch {
            name: "main".to_string(),
            is_remote: false,
            is_head: true,
            target_commit_id: "abc123".to_string(),
            upstream: Some("origin/main".to_string()),
        };
        let json = serde_json::to_string(&branch).unwrap();
        let parsed: Branch = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed, branch);
    }
}
