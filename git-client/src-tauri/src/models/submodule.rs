use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Submodule {
    pub name: String,
    pub path: String,
    pub url: String,
    pub branch: Option<String>,
    pub sha: String,
    pub is_initialized: bool,
}
