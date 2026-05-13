use crate::utils::error::AppError;
use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ResetMode {
    Soft,
    Mixed,
    Hard,
}

pub fn reset(
    repo_path: &Path,
    commit_id: &str,
    mode: ResetMode,
) -> Result<(), AppError> {
    let repo = git2::Repository::open(repo_path)?;
    let oid = git2::Oid::from_str(commit_id)?;
    let commit = repo.find_commit(oid)?;
    let obj = commit.as_object();

    let reset_type = match mode {
        ResetMode::Soft => git2::ResetType::Soft,
        ResetMode::Mixed => git2::ResetType::Mixed,
        ResetMode::Hard => git2::ResetType::Hard,
    };

    repo.reset(&obj, reset_type, None)?;
    Ok(())
}
