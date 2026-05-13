use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct CommitRef {
    pub name: String,
    pub ref_type: RefType,
    pub is_head: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum RefType {
    Local,
    Remote,
    Tag,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Commit {
    pub id: String,
    pub message: String,
    pub author: String,
    pub author_email: String,
    pub time: i64,
    pub parent_ids: Vec<String>,
    pub refs: Vec<CommitRef>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SearchFilter {
    All,
    Message,
    Author,
    Hash,
    File,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_commit_serialize_deserialize() {
        let commit = Commit {
            id: "abc123".to_string(),
            message: "init".to_string(),
            author: "user".to_string(),
            author_email: "user@example.com".to_string(),
            time: 1700000000,
            parent_ids: vec!["parent1".to_string()],
            refs: vec![
            CommitRef { name: "main".to_string(), ref_type: RefType::Local, is_head: true },
            CommitRef { name: "v1.0".to_string(), ref_type: RefType::Tag, is_head: false },
        ],
        };
        let json = serde_json::to_string(&commit).unwrap();
        let parsed: Commit = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed, commit);
    }

    #[test]
    fn test_commit_refs_default_empty() {
        let commit = Commit {
            id: "def456".to_string(),
            message: "second".to_string(),
            author: "user".to_string(),
            author_email: "user@example.com".to_string(),
            time: 1700000100,
            parent_ids: vec![],
            refs: vec![],
        };
        let json = serde_json::to_string(&commit).unwrap();
        let parsed: Commit = serde_json::from_str(&json).unwrap();
        assert!(parsed.refs.is_empty());
    }
}
