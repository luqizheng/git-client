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

#[derive(serde::Serialize)]
pub struct FileContent {
    pub old_content: Option<String>,
    pub new_content: Option<String>,
    pub old_path: Option<String>,
    pub new_path: Option<String>,
}

pub fn get_file_content(
    repo: &git2::Repository,
    commit_id: &str,
    file_path: &str,
) -> Result<FileContent, AppError> {
    let oid = git2::Oid::from_str(commit_id)?;
    let commit = repo.find_commit(oid)?;
    let tree = commit.tree()?;
    let parent_tree = if commit.parent_count() > 0 {
        Some(repo.find_commit(commit.parent_id(0)?)?.tree()?)
    } else {
        None
    };

    let new_content = get_blob_content(repo, &tree, file_path)?;
    
    let (old_content, old_path) = if let Some(ref parent) = parent_tree {
        let mut old_content = get_blob_content(repo, parent, file_path)?;
        let mut old_path = Some(file_path.to_string());
        
        if old_content.is_none() {
            if let Ok(diff) = repo.diff_tree_to_tree(Some(parent), Some(&tree), None) {
                for i in 0..diff.deltas().len() {
                    if let Some(delta) = diff.get_delta(i) {
                        let delta_new_path = delta.new_file().path()
                            .map(|p| p.to_string_lossy().to_string());
                        if delta_new_path == Some(file_path.to_string()) {
                            if let Some(old_p) = delta.old_file().path() {
                                let old_p_str = old_p.to_string_lossy().to_string();
                                old_content = get_blob_content(repo, parent, &old_p_str)?;
                                old_path = Some(old_p_str);
                                break;
                            }
                        }
                    }
                }
            }
        }
        (old_content, old_path)
    } else {
        (None, None)
    };

    Ok(FileContent {
        old_content,
        new_content,
        old_path,
        new_path: Some(file_path.to_string()),
    })
}

fn get_blob_content(
    repo: &git2::Repository,
    tree: &git2::Tree,
    path: &str,
) -> Result<Option<String>, AppError> {
    match tree.get_path(std::path::Path::new(path)) {
        Ok(entry) => {
            let blob = repo.find_blob(entry.id())?;
            Ok(Some(String::from_utf8_lossy(blob.content()).to_string()))
        }
        Err(_) => Ok(None),
    }
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
