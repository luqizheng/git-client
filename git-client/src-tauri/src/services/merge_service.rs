use crate::models::remote::ConflictFile;
use crate::utils::error::AppError;

pub fn merge(repo: &mut git2::Repository, branch: &str) -> Result<MergeResult, AppError> {
    let branch_ref = repo.find_reference(&format!("refs/heads/{}", branch))?;
    let annotated = repo.reference_to_annotated_commit(&branch_ref)?;
    let analysis = repo.merge_analysis(&[&annotated])?;
    let had_conflicts = if analysis.0.is_up_to_date() {
        false
    } else {
        repo.merge(&[&annotated], None, None)?;
        let index = repo.index()?;
        index.has_conflicts()
    };
    let conflicts = if had_conflicts {
        let index = repo.index()?;
        collect_conflicts(&index)?
    } else {
        Vec::new()
    };
    Ok(MergeResult {
        branch: branch.to_string(),
        had_conflicts,
        conflicts,
    })
}

pub fn resolve_conflict(repo: &git2::Repository, path: &str, content: &str) -> Result<(), AppError> {
    let workdir = repo.workdir().ok_or(AppError::NotARepo("bare repo".to_string()))?;
    let file_path = workdir.join(path);
    std::fs::write(&file_path, content)?;
    let mut index = repo.index()?;
    index.add_path(std::path::Path::new(path))?;
    index.write()?;
    Ok(())
}

fn collect_conflicts(index: &git2::Index) -> Result<Vec<ConflictFile>, AppError> {
    let mut conflicts = Vec::new();
    for i in 0..index.len() {
        if let Some(entry) = index.get(i) {
            let path_bytes: &[u8] = entry.path.as_ref();
            let path = String::from_utf8_lossy(path_bytes).to_string();
            let stage_val = entry.mode & 0x3000;
            let ours = stage_val == 0x2000;
            let theirs = stage_val == 0x3000;
            if ours || theirs {
                conflicts.push(ConflictFile {
                    path,
                    ours_modified: ours,
                    theirs_modified: theirs,
                });
            }
        }
    }
    Ok(conflicts)
}

#[derive(Debug, serde::Serialize)]
pub struct MergeResult {
    pub branch: String,
    pub had_conflicts: bool,
    pub conflicts: Vec<ConflictFile>,
}

#[derive(Debug, serde::Serialize)]
pub struct RebaseResult {
    pub branch: String,
    pub had_conflicts: bool,
    pub conflicts: Vec<ConflictFile>,
}

#[derive(Debug, serde::Serialize)]
pub struct CherryPickResult {
    pub commit_id: String,
    pub had_conflicts: bool,
    pub conflicts: Vec<ConflictFile>,
}

pub fn cherry_pick(repo: &mut git2::Repository, commit_id: &str) -> Result<CherryPickResult, AppError> {
    let oid = git2::Oid::from_str(commit_id)?;
    let commit = repo.find_commit(oid)?;
    repo.cherrypick_commit(&commit, &repo.head()?.peel_to_commit()?, 0, None)?;
    let index = repo.index()?;
    let had_conflicts = index.has_conflicts();
    let conflicts = if had_conflicts {
        collect_conflicts(&index)?
    } else {
        Vec::new()
    };
    Ok(CherryPickResult {
        commit_id: commit_id.to_string(),
        had_conflicts,
        conflicts,
    })
}
