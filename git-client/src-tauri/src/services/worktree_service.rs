use crate::models::worktree::Worktree;
use crate::utils::error::AppError;
use git2::Repository;

pub fn list_worktrees(repo: &Repository) -> Result<Vec<Worktree>, AppError> {
    let mut worktrees = Vec::new();
    let names = repo.worktrees()?;
    for i in 0..names.len() {
        if let Some(name) = names.get(i) {
            if let Ok(wt) = repo.find_worktree(name) {
                let path = wt.path().to_string_lossy().to_string();
                worktrees.push(Worktree {
                    id: name.to_string(),
                    path,
                    branch: String::new(),
                    commit: String::new(),
                    is_prunable: false,
                });
            }
        }
    }
    Ok(worktrees)
}

pub fn create_worktree(repo: &Repository, branch: &str, path: &str) -> Result<Worktree, AppError> {
    let _wt = repo.worktree(branch, std::path::Path::new(path), None)?;
    Ok(Worktree {
        id: branch.to_string(),
        path: path.to_string(),
        branch: branch.to_string(),
        commit: String::new(),
        is_prunable: false,
    })
}

pub fn delete_worktree(repo: &Repository, path: &str) -> Result<(), AppError> {
    std::fs::remove_dir_all(path)?;
    Ok(())
}
