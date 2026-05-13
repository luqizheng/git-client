use crate::models::diff::{DiffStatus, FileDiff};
use crate::utils::error::AppError;

pub fn get_commit_diff(repo: &git2::Repository, commit_id: &str) -> Result<Vec<FileDiff>, AppError> {
    let oid = git2::Oid::from_str(commit_id)?;
    let commit = repo.find_commit(oid)?;
    let tree = commit.tree()?;
    let parent_tree = if commit.parent_count() > 0 {
        Some(repo.find_commit(commit.parent_id(0)?)?.tree()?)
    } else {
        None
    };
    let diff = repo.diff_tree_to_tree(parent_tree.as_ref(), Some(&tree), None)?;
    parse_diff(&diff)
}

pub fn get_working_diff(repo: &git2::Repository) -> Result<Vec<FileDiff>, AppError> {
    let diff = repo.diff_index_to_workdir(None, None)?;
    parse_diff(&diff)
}

pub fn get_staged_diff(repo: &git2::Repository) -> Result<Vec<FileDiff>, AppError> {
    let head = repo.head()?;
    let _tree = head.peel_to_tree()?;
    let diff = repo.diff_tree_to_index(Some(&_tree), None, None)?;
    parse_diff(&diff)
}

fn parse_diff(diff: &git2::Diff) -> Result<Vec<FileDiff>, AppError> {
    let mut files = Vec::new();
    for i in 0..diff.deltas().len() {
        let delta = diff.get_delta(i).unwrap();
        let status = match delta.status() {
            git2::Delta::Added => DiffStatus::Added,
            git2::Delta::Deleted => DiffStatus::Deleted,
            git2::Delta::Modified => DiffStatus::Modified,
            git2::Delta::Renamed => DiffStatus::Renamed,
            git2::Delta::Copied => DiffStatus::Copied,
            _ => DiffStatus::Modified,
        };
        let path = delta
            .new_file()
            .path()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_default();
        let old_path = delta
            .old_file()
            .path()
            .map(|p| p.to_string_lossy().to_string());
        files.push(FileDiff {
            path,
            old_path,
            status,
            hunks: Vec::new(),
        });
    }
    Ok(files)
}

pub fn stage_files(repo: &git2::Repository, paths: &[String]) -> Result<(), AppError> {
    let mut index = repo.index()?;
    for path in paths {
        index.add_path(std::path::Path::new(path))?;
    }
    index.write()?;
    Ok(())
}

pub fn unstage_files(repo: &git2::Repository, paths: &[String]) -> Result<(), AppError> {
    let mut index = repo.index()?;
    for path in paths {
        index.remove_path(std::path::Path::new(path))?;
    }
    index.write()?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::repo_service;
    use tempfile::TempDir;

    fn setup_repo() -> (TempDir, git2::Repository) {
        let dir = TempDir::new().unwrap();
        let path = dir.path().to_string_lossy().to_string();
        repo_service::init_repo(&path, false).unwrap();
        let repo = git2::Repository::open(&path).unwrap();
        let sig = repo.signature().unwrap();
        let workdir = repo.workdir().unwrap();
        std::fs::write(workdir.join("README.md"), "# test").unwrap();
        let mut index = repo.index().unwrap();
        index.add_path(std::path::Path::new("README.md")).unwrap();
        let tree_id = index.write_tree().unwrap();
        let _tree = repo.find_tree(tree_id).unwrap();
        repo.commit(Some("HEAD"), &sig, &sig, "init", &_tree, &[]).unwrap();
        drop(_tree);
        (dir, repo)
    }

    #[test]
    fn test_get_working_diff_empty() {
        let (dir, repo) = setup_repo();
        let diffs = get_working_diff(&repo).unwrap();
        assert!(diffs.is_empty());
        drop(repo);
        drop(dir);
    }
}
