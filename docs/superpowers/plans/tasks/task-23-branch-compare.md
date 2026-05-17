# Task 23: Branch Compare — Backend

> **Phase:** 4 — P3 Enhancement | **Dependencies:** none
> **Plan origin:** `docs/superpowers/plans/2026-05-17-git-client-features-implementation.md`

**Files:**
- Modify: `git-client/src-tauri/src/services/branch_service.rs`
- Modify: `git-client/src-tauri/src/commands/branch.rs`
- Modify: `git-client/src-tauri/src/lib.rs`

---

- [ ] **Step 1: Add BranchCompareResult struct and compare_branches function in branch_service.rs**

```rust
#[derive(Debug, serde::Serialize)]
pub struct BranchCompareResult {
    pub ahead: u32,
    pub behind: u32,
    pub base_commit: String,
    pub compare_commit: String,
}

pub fn compare_branches(
    repo: &git2::Repository,
    base: &str,
    compare: &str,
) -> Result<BranchCompareResult, AppError> {
    let base_oid = repo.revparse_single(base)?.id();
    let compare_oid = repo.revparse_single(compare)?.id();

    let ahead = count_commits_between(repo, compare_oid, base_oid)?;
    let behind = count_commits_between(repo, base_oid, compare_oid)?;

    Ok(BranchCompareResult {
        ahead,
        behind,
        base_commit: base_oid.to_string(),
        compare_commit: compare_oid.to_string(),
    })
}

fn count_commits_between(
    repo: &git2::Repository,
    from: git2::Oid,
    to: git2::Oid,
) -> Result<u32, AppError> {
    let mut revwalk = repo.revwalk()?;
    revwalk.push(to)?;
    revwalk.hide(from)?;
    Ok(revwalk.count() as u32)
}
```

- [ ] **Step 2: Add compare_branches command in commands/branch.rs**

```rust
#[tauri::command]
pub async fn compare_branches(
    state: State<'_, AppState>,
    repo_path: String,
    base: String,
    compare: String,
) -> Result<branch_service::BranchCompareResult, AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        branch_service::compare_branches(&repo, &base, &compare)
    })
    .await?
}
```

- [ ] **Step 3: Update lib.rs `generate_handler!`**

```rust
            commands::branch::compare_branches,
```

- [ ] **Step 4: Verify compilation**

```bash
cd git-client/src-tauri && cargo build
```

- [ ] **Step 5: Commit**

```bash
git add git-client/src-tauri/src/services/branch_service.rs git-client/src-tauri/src/commands/branch.rs git-client/src-tauri/src/lib.rs
git commit -m "feat(branch): add branch compare"
```
