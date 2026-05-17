# Task 20: Worktree — Backend Service

> **Phase:** 3 — P2 Useful | **Dependencies:** Task 19 (Worktree model)
> **Plan origin:** `docs/superpowers/plans/2026-05-17-git-client-features-implementation.md`

**Files:**
- Create: `git-client/src-tauri/src/services/worktree_service.rs`
- Modify: `git-client/src-tauri/src/services/mod.rs`

---

- [ ] **Step 1: Create worktree_service.rs**

```rust
use crate::models::worktree::Worktree;
use crate::utils::error::AppError;
use git2::Repository;

pub fn list_worktrees(repo: &Repository) -> Result<Vec<Worktree>, AppError> {
    let mut worktrees = Vec::new();
    for wt in repo.worktrees()? {
        if let Ok(wt) = wt {
            worktrees.push(Worktree {
                id: wt.id().to_string(),
                path: wt.path().to_string_lossy().to_string(),
                branch: wt.head_shorthand().unwrap_or("").to_string(),
                commit: wt.head_id().map(|id| id.to_string()).unwrap_or_default(),
                is_prunable: wt.is_prunable(),
            });
        }
    }
    Ok(worktrees)
}

pub fn create_worktree(repo: &Repository, branch: &str, path: &str) -> Result<Worktree, AppError> {
    let wt = repo.worktree_add(branch, path, None)?;
    Ok(Worktree {
        id: wt.id().to_string(),
        path: path.to_string(),
        branch: branch.to_string(),
        commit: wt.head_id().map(|id| id.to_string()).unwrap_or_default(),
        is_prunable: false,
    })
}

pub fn delete_worktree(repo: &Repository, path: &str) -> Result<(), AppError> {
    repo.worktree_remove(path, None)?;
    Ok(())
}
```

- [ ] **Step 2: Update services/mod.rs**

```rust
pub mod worktree_service;
```

- [ ] **Step 3: Verify compilation**

```bash
cd git-client/src-tauri && cargo build
```

- [ ] **Step 4: Commit**

```bash
git add git-client/src-tauri/src/services/worktree_service.rs git-client/src-tauri/src/services/mod.rs
git commit -m "feat(worktree): add worktree service"
```
