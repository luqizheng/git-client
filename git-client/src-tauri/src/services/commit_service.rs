use crate::models::commit::Commit;
use crate::utils::error::AppError;

pub fn log(repo: &git2::Repository, limit: u32, after: Option<&str>) -> Result<Vec<Commit>, AppError> {
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
        commits.push(commit_from_git(&git_commit));
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

    if amend {
        let head = repo.head()?;
        let head_commit = head.peel_to_commit()?;
        let sig = repo.signature()?;
        let oid = repo.commit(
            Some("HEAD"),
            &sig,
            &sig,
            message,
            &tree,
            &[&head_commit],
        )?;
        let new_commit = repo.find_commit(oid)?;
        Ok(commit_from_git(&new_commit))
    } else {
        let sig = repo.signature()?;
        let head = repo.head()?;
        let parent = head.peel_to_commit()?;
        let oid = repo.commit(
            Some("HEAD"),
            &sig,
            &sig,
            message,
            &tree,
            &[&parent],
        )?;
        let new_commit = repo.find_commit(oid)?;
        Ok(commit_from_git(&new_commit))
    }
}

fn commit_from_git(c: &git2::Commit) -> Commit {
    Commit {
        id: c.id().to_string(),
        message: c.message().unwrap_or("").to_string(),
        author: c.author().name().unwrap_or("").to_string(),
        author_email: c.author().email().unwrap_or("").to_string(),
        time: c.time().seconds(),
        parent_ids: c.parent_ids().map(|p| p.to_string()).collect(),
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
}
