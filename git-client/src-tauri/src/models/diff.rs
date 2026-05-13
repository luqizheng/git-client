use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct FileDiff {
    pub path: String,
    pub old_path: Option<String>,
    pub status: DiffStatus,
    pub hunks: Vec<Hunk>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum DiffStatus {
    Added,
    Modified,
    Deleted,
    Renamed,
    Copied,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Hunk {
    pub old_start: u32,
    pub old_lines: u32,
    pub new_start: u32,
    pub new_lines: u32,
    pub lines: Vec<DiffLine>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum DiffLine {
    Context(String),
    Addition(String),
    Deletion(String),
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_file_diff_roundtrip() {
        let diff = FileDiff {
            path: "src/main.rs".to_string(),
            old_path: None,
            status: DiffStatus::Modified,
            hunks: vec![Hunk {
                old_start: 1,
                old_lines: 3,
                new_start: 1,
                new_lines: 4,
                lines: vec![
                    DiffLine::Context("fn main()".to_string()),
                    DiffLine::Addition("    println!(\"hello\")".to_string()),
                    DiffLine::Deletion("    println!(\"hi\")".to_string()),
                ],
            }],
        };
        let json = serde_json::to_string(&diff).unwrap();
        let parsed: FileDiff = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed, diff);
    }
}
