use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tag {
    pub name: String,
    pub target: String,
    pub message: Option<String>,
    pub tagger: Option<String>,
    pub date: Option<String>,
}
