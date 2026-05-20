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

pub fn get_merge_conflicts(repo: &git2::Repository) -> Result<Vec<ConflictFile>, AppError> {
    let index = repo.index()?;
    if !index.has_conflicts() {
        return Ok(Vec::new());
    }
    collect_conflicts_with_content(repo, &index)
}

pub fn mark_resolved(repo: &git2::Repository, path: &str) -> Result<(), AppError> {
    let mut index = repo.index()?;
    index.add_path(std::path::Path::new(path))?;
    index.remove(std::path::Path::new(path), 0)?;
    index.write()?;
    Ok(())
}

pub fn complete_merge(repo: &git2::Repository, message: &str) -> Result<String, AppError> {
    let mut index = repo.index()?;
    if index.has_conflicts() {
        return Err(AppError::Conflict(vec![ConflictFile {
            path: String::new(),
            ours_modified: false,
            theirs_modified: false,
            ours_content: None,
            theirs_content: None,
            base_content: Some("Unresolved conflicts remain".to_string()),
        }]));
    }

    let sig = repo.signature()?;
    let tree_id = index.write_tree_to(repo)?;
    let tree = repo.find_tree(tree_id)?;

    let head = repo.head()?;
    let head_commit = head.peel_to_commit()?;

    let commit_id = repo.commit(
        Some("HEAD"),
        &sig,
        &sig,
        message,
        &tree,
        &[&head_commit],
    )?;

    repo.cleanup_state()?;

    Ok(commit_id.to_string())
}

fn collect_conflicts_with_content(repo: &git2::Repository, index: &git2::Index) -> Result<Vec<ConflictFile>, AppError> {
    let mut conflicts: Vec<ConflictFile> = Vec::new();
    let workdir = repo.workdir().ok_or(AppError::NotARepo("bare repo".to_string()))?;

    for i in 0..index.len() {
        if let Some(entry) = index.get(i) {
            let path_bytes: &[u8] = entry.path.as_ref();
            let path = String::from_utf8_lossy(path_bytes).to_string();

            let stage_val = entry.mode & 0x3000;

            if stage_val == 0x2000 {
                let content = entry_to_content(repo, &entry)?;
                let (base, ours, theirs) = read_conflict_markers(&content, workdir, &path)?;

                if let Some(c) = conflicts.iter_mut().find(|c| c.path == path) {
                    c.ours_content = Some(ours);
                    c.ours_modified = true;
                    c.base_content = Some(base);
                } else {
                    conflicts.push(ConflictFile {
                        path: path.clone(),
                        ours_modified: true,
                        theirs_modified: false,
                        ours_content: Some(ours),
                        theirs_content: None,
                        base_content: Some(base),
                    });
                }
            } else if stage_val == 0x3000 {
                let content = entry_to_content(repo, &entry)?;
                let (base, ours, theirs) = read_conflict_markers(&content, workdir, &path)?;

                if let Some(c) = conflicts.iter_mut().find(|c| c.path == path) {
                    c.theirs_content = Some(theirs);
                    c.theirs_modified = true;
                } else {
                    conflicts.push(ConflictFile {
                        path: path.clone(),
                        ours_modified: false,
                        theirs_modified: true,
                        ours_content: None,
                        theirs_content: Some(theirs),
                        base_content: Some(base),
                    });
                }
            }
        }
    }

    Ok(conflicts)
}

fn entry_to_content(repo: &git2::Repository, entry: &git2::IndexEntry) -> Result<String, AppError> {
    let blob = repo.find_blob(entry.id)?;
    Ok(String::from_utf8_lossy(blob.content()).to_string())
}

fn read_conflict_markers(content: &str, workdir: &std::path::Path, path: &str) -> Result<(String, String, String), AppError> {
    let file_path = workdir.join(path);
    let file_content = std::fs::read_to_string(&file_path).unwrap_or_default();

    let parts: Vec<&str> = file_content.split("<<<<<<< HEAD").collect();
    if parts.len() < 2 {
        return Ok((String::new(), content.to_string(), String::new()));
    }

    let rest = parts[1];
    let ours_end = rest.find("=======").unwrap_or(rest.len());
    let ours = rest[..ours_end].trim().to_string();

    let theirs_parts: Vec<&str> = rest[ours_end..].split(">>>>>>>").collect();
    let theirs = if theirs_parts.len() > 1 {
        theirs_parts[1].trim().to_string()
    } else {
        String::new()
    };

    Ok((String::new(), ours, theirs))
}

fn collect_conflicts(index: &git2::Index) -> Result<Vec<ConflictFile>, AppError> {
    let mut conflicts: Vec<ConflictFile> = Vec::new();
    for i in 0..index.len() {
        if let Some(entry) = index.get(i) {
            let path_bytes: &[u8] = entry.path.as_ref();
            let path = String::from_utf8_lossy(path_bytes).to_string();
            let stage_val = entry.mode & 0x3000;
            let ours = stage_val == 0x2000;
            let theirs = stage_val == 0x3000;
            if ours || theirs {
                if !conflicts.iter().any(|c: &ConflictFile| c.path == path) {
                    conflicts.push(ConflictFile {
                        path,
                        ours_modified: ours,
                        theirs_modified: theirs,
                        ours_content: None,
                        theirs_content: None,
                        base_content: None,
                    });
                }
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

pub fn revert(repo: &mut git2::Repository, commit_id: &str) -> Result<(), AppError> {
    let oid = git2::Oid::from_str(commit_id)?;
    let commit = repo.find_commit(oid)?;
    let mut opts = git2::RevertOptions::new();
    repo.revert(&commit, Some(&mut opts))?;
    let index = repo.index()?;
    if index.has_conflicts() {
        return Err(AppError::Conflict(Vec::new()));
    }
    Ok(())
}
