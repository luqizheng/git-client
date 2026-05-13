use crate::models::repo::RepoState;
use crate::utils::error::AppError;

pub fn open_repo(path: &str) -> Result<RepoState, AppError> {
    let repo = git2::Repository::open(path)?;
    repo_state_from_repo(&repo)
}

pub fn init_repo(path: &str, bare: bool) -> Result<RepoState, AppError> {
    let repo = if bare {
        git2::Repository::init_bare(path)?
    } else {
        git2::Repository::init(path)?
    };
    repo_state_from_repo(&repo)
}

pub fn clone_repo(url: &str, path: &str) -> Result<RepoState, AppError> {
    let repo = git2::Repository::clone(url, path)?;
    repo_state_from_repo(&repo)
}

fn repo_state_from_repo(repo: &git2::Repository) -> Result<RepoState, AppError> {
    let head = repo.head().ok();
    let head_branch = head
        .as_ref()
        .and_then(|h| h.shorthand())
        .map(String::from);
    let head_commit_id = head
        .as_ref()
        .and_then(|h| h.target())
        .map(|oid| oid.to_string());
    let is_bare = repo.is_bare();
    let is_empty = repo.is_empty()?;
    Ok(RepoState {
        path: repo.path().to_string_lossy().to_string(),
        head_branch,
        head_commit_id,
        is_bare,
        is_empty,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_init_repo() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().to_string_lossy().to_string();
        let state = init_repo(&path, false).unwrap();
        assert_eq!(state.is_bare, false);
        assert_eq!(state.is_empty, true);
    }

    #[test]
    fn test_open_nonexistent_repo() {
        let result = open_repo("/nonexistent/path");
        assert!(result.is_err());
    }

    #[test]
    fn test_init_bare_repo() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().to_string_lossy().to_string();
        let state = init_repo(&path, true).unwrap();
        assert_eq!(state.is_bare, true);
    }
}
