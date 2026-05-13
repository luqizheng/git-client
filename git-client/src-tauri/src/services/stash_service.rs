use crate::models::stash::StashEntry;
use crate::utils::error::AppError;

pub fn stash_save(repo: &mut git2::Repository, message: &str) -> Result<StashEntry, AppError> {
    let sig = repo.signature()?;
    let oid = repo.stash_save(&sig, message, None)?;
    Ok(StashEntry {
        index: 0,
        message: message.to_string(),
        commit_id: oid.to_string(),
    })
}

pub fn stash_list(repo: &mut git2::Repository) -> Result<Vec<StashEntry>, AppError> {
    let mut entries = Vec::new();
    repo.stash_foreach(|index, msg, oid| {
        entries.push(StashEntry {
            index: index as u32,
            message: msg.to_string(),
            commit_id: oid.to_string(),
        });
        true
    })?;
    Ok(entries)
}

pub fn stash_pop(repo: &mut git2::Repository, index: usize) -> Result<(), AppError> {
    repo.stash_pop(index, None)?;
    Ok(())
}

pub fn stash_drop(repo: &mut git2::Repository, index: usize) -> Result<(), AppError> {
    repo.stash_drop(index)?;
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
    fn test_stash_list_empty() {
        let (dir, repo) = setup_repo_with_commit();
        let mut repo_mut = repo;
        let entries = stash_list(&mut repo_mut).unwrap();
        assert!(entries.is_empty());
        drop(repo_mut);
        drop(dir);
    }
}
