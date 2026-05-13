use std::collections::HashMap;

use crate::models::commit::Commit;
use crate::utils::error::AppError;

fn build_ref_map(repo: &git2::Repository) -> Result<HashMap<String, Vec<String>>, AppError> {
    let mut map: HashMap<String, Vec<String>> = HashMap::new();
    let refs = repo.references()?;
    for reference in refs {
        let reference = reference?;
        if let Some(name) = reference.shorthand() {
            if let Ok(oid) = reference.target().ok_or_else(|| git2::Error::from_str("no target")) {
                map.entry(oid.to_string())
                    .or_default()
                    .push(name.to_string());
            }
        }
    }
    Ok(map)
}

pub fn log(repo: &git2::Repository, limit: u32, after: Option<&str>) -> Result<Vec<Commit>, AppError> {
    let ref_map = build_ref_map(repo)?;
    let mut revwalk = repo.revwalk()?;
    revwalk.push_head()?;
    if let Some(id) = after {
        let oid = git2::Oid::from_str(id)?;
        revwalk.hide(oid)?;
    }
    let mut commits = Vec::new();
    for oid_result in revwalk.take(limit as usize) {
        let oid = oid_result?;
        let git_commit = repo.find_commit(oid)?;
        let refs = ref_map.get(&oid.to_string()).cloned().unwrap_or_default();
        commits.push(commit_from_git(&git_commit, refs));
    }
    Ok(commits)
}

pub fn create_commit(
    repo: &git2::Repository,
    message: &str,
    amend: bool,
) -> Result<Commit, AppError> {
    let mut index = repo.index()?;
    index.write()?;

    let tree_id = index.write_tree()?;
    let tree = repo.find_tree(tree_id)?;
    let sig = repo.signature()?;

    let parents: Vec<git2::Commit> = if amend {
        let head = repo.head()?;
        vec![head.peel_to_commit()?]
    } else if repo.is_empty()? {
        vec![]
    } else {
        let head = repo.head()?;
        vec![head.peel_to_commit()?]
    };

    let parent_refs: Vec<&git2::Commit> = parents.iter().collect();
    let oid = repo.commit(Some("HEAD"), &sig, &sig, message, &tree, &parent_refs)?;
    let new_commit = repo.find_commit(oid)?;
    let ref_map = build_ref_map(repo)?;
    let refs = ref_map.get(&oid.to_string()).cloned().unwrap_or_default();
    Ok(commit_from_git(&new_commit, refs))
}

fn commit_from_git(c: &git2::Commit, refs: Vec<String>) -> Commit {
    Commit {
        id: c.id().to_string(),
        message: c.message().unwrap_or("").to_string(),
        author: c.author().name().unwrap_or("").to_string(),
        author_email: c.author().email().unwrap_or("").to_string(),
        time: c.time().seconds(),
        parent_ids: c.parent_ids().map(|p| p.to_string()).collect(),
        refs,
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
        (dir, repo)
    }

    fn create_initial_commit(repo: &git2::Repository) -> git2::Oid {
        let sig = repo.signature().unwrap();
        let mut index = repo.index().unwrap();
        std::fs::write(repo.workdir().unwrap().join("README.md"), "# test").unwrap();
        index.add_path(std::path::Path::new("README.md")).unwrap();
        let tree_id = index.write_tree().unwrap();
        let tree = repo.find_tree(tree_id).unwrap();
        repo.commit(Some("HEAD"), &sig, &sig, "initial commit", &tree, &[])
            .unwrap()
    }

    #[test]
    fn test_log_empty_repo() {
        let (dir, repo) = setup_repo();
        let result = log(&repo, 10, None);
        assert!(result.is_err() || result.unwrap().is_empty());
        drop(repo);
        drop(dir);
    }

    #[test]
    fn test_log_with_commits() {
        let (dir, repo) = setup_repo();
        create_initial_commit(&repo);
        let commits = log(&repo, 10, None).unwrap();
        assert_eq!(commits.len(), 1);
        assert_eq!(commits[0].message, "initial commit");
        drop(repo);
        drop(dir);
    }

    #[test]
    fn test_create_commit_on_empty_repo() {
        let (dir, repo) = setup_repo();
        std::fs::write(repo.workdir().unwrap().join("hello.txt"), "hello world").unwrap();
        let mut index = repo.index().unwrap();
        index.add_path(std::path::Path::new("hello.txt")).unwrap();
        index.write().unwrap();
        let result = create_commit(&repo, "first commit", false);
        assert!(result.is_ok(), "create_commit should work on empty repo");
        let commit = result.unwrap();
        assert_eq!(commit.message, "first commit");
        assert!(commit.parent_ids.is_empty());
        drop(repo);
        drop(dir);
    }

    #[test]
    fn test_create_commit_on_non_empty_repo() {
        let (dir, repo) = setup_repo();
        create_initial_commit(&repo);
        std::fs::write(repo.workdir().unwrap().join("second.txt"), "second file").unwrap();
        let mut index = repo.index().unwrap();
        index.add_path(std::path::Path::new("second.txt")).unwrap();
        index.write().unwrap();
        let result = create_commit(&repo, "add second file", false);
        assert!(result.is_ok());
        let commit = result.unwrap();
        assert_eq!(commit.message, "add second file");
        assert_eq!(commit.parent_ids.len(), 1);
        drop(repo);
        drop(dir);
    }

    #[test]
    fn test_full_workflow_init_add_commit_log() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().to_string_lossy().to_string();

        let repo_state = repo_service::init_repo(&path, false).unwrap();
        assert!(repo_state.is_empty);
        assert!(repo_state.head_branch.is_none());

        let repo = git2::Repository::open(&path).unwrap();

        let workdir = repo.workdir().unwrap();
        std::fs::write(workdir.join("hello.txt"), "hello world").unwrap();

        crate::services::diff_service::stage_files(&repo, &["hello.txt".to_string()]).unwrap();

        let commit = create_commit(&repo, "first commit", false).unwrap();
        assert_eq!(commit.message, "first commit");
        assert!(commit.parent_ids.is_empty());

        let commits = log(&repo, 10, None).unwrap();
        assert_eq!(commits.len(), 1);
        assert_eq!(commits[0].id, commit.id);

        drop(repo);
        drop(dir);
    }
}
