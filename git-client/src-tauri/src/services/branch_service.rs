use crate::models::branch::Branch;
use crate::utils::error::AppError;

pub fn list_branches(repo: &git2::Repository) -> Result<Vec<Branch>, AppError> {
    let mut branches = Vec::new();
    let head_oid = repo.head().ok().and_then(|h| h.target());
    for branch_result in repo.branches(Some(git2::BranchType::Local))? {
        let (branch, _bt) = branch_result?;
        let name = branch.name()?.unwrap_or("").to_string();
        let target = branch.get().target().map(|o| o.to_string()).unwrap_or_default();
        let is_head = head_oid.map_or(false, |h| {
            branch.get().target().map_or(false, |t| t == h)
        });
        let upstream = branch.upstream().ok().and_then(|u| {
            u.name().ok().flatten().map(String::from)
        });
        branches.push(Branch {
            name,
            is_remote: false,
            is_head,
            target_commit_id: target,
            upstream,
        });
    }
    for branch_result in repo.branches(Some(git2::BranchType::Remote))? {
        let (branch, _bt) = branch_result?;
        let name = branch.name()?.unwrap_or("").to_string();
        let target = branch.get().target().map(|o| o.to_string()).unwrap_or_default();
        branches.push(Branch {
            name,
            is_remote: true,
            is_head: false,
            target_commit_id: target,
            upstream: None,
        });
    }
    Ok(branches)
}

pub fn create_branch(repo: &git2::Repository, name: &str, checkout: bool) -> Result<Branch, AppError> {
    let head = repo.head()?;
    let target = head.target().ok_or(AppError::BranchNotFound("HEAD".to_string()))?;
    let commit = repo.find_commit(target)?;
    let branch = repo.branch(name, &commit, false)?;
    if checkout {
        let refname = branch.get().name().ok_or(AppError::BranchNotFound(name.to_string()))?;
        repo.set_head(refname)?;
        repo.checkout_head(Some(git2::build::CheckoutBuilder::default().force()))?;
    }
    let target_id = branch.get().target().map(|o| o.to_string()).unwrap_or_default();
    Ok(Branch {
        name: name.to_string(),
        is_remote: false,
        is_head: checkout,
        target_commit_id: target_id,
        upstream: None,
    })
}

pub fn switch_branch(repo: &git2::Repository, name: &str) -> Result<(), AppError> {
    let branch = repo.find_branch(name, git2::BranchType::Local)?;
    let refname = branch.get().name().ok_or(AppError::BranchNotFound(name.to_string()))?;
    repo.set_head(refname)?;
    repo.checkout_head(Some(git2::build::CheckoutBuilder::default().force()))?;
    Ok(())
}

pub fn delete_branch(repo: &git2::Repository, name: &str, _force: bool) -> Result<(), AppError> {
    let mut branch = repo.find_branch(name, git2::BranchType::Local)?;
    branch.delete()?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::repo_service;
    use tempfile::TempDir;

    fn setup_repo_with_commit() -> (TempDir, git2::Repository) {
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
    fn test_list_branches() {
        let (dir, repo) = setup_repo_with_commit();
        let branches = list_branches(&repo).unwrap();
        assert!(!branches.is_empty());
        let has_main = branches.iter().any(|b| b.is_head);
        assert!(has_main);
        drop(repo);
        drop(dir);
    }

    #[test]
    fn test_create_and_switch_branch() {
        let (dir, repo) = setup_repo_with_commit();
        let branch = create_branch(&repo, "feature", false).unwrap();
        assert_eq!(branch.name, "feature");
        switch_branch(&repo, "feature").unwrap();
        let branches = list_branches(&repo).unwrap();
        let feature = branches.iter().find(|b| b.name == "feature").unwrap();
        assert!(feature.is_head);
        drop(repo);
        drop(dir);
    }
}
