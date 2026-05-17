use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Worktree {
    pub id: String,
    pub path: String,
    pub branch: String,
    pub commit: String,
    pub is_prunable: bool,
}
