use serde::Serialize;

#[derive(Serialize, Debug, Clone)]
pub struct BlameLine {
    pub line_number: usize,
    pub commit_id: String,
    pub author: String,
    pub author_email: String,
    pub timestamp: i64,
    pub summary: String,
    pub is_boundary: bool,
}

#[derive(Serialize, Debug, Clone)]
pub struct BlameResult {
    pub file_path: String,
    pub lines: Vec<BlameLine>,
}
