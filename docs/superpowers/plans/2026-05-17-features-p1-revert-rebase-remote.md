# P1 重要功能：Revert + Rebase + 高级远程操作

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 P1 优先级功能：Revert、Rebase、高级远程操作（删除/重命名远程）。

**Architecture:** 遵循现有分层：Rust commands → services → git2；前端 Vue 3 → Pinia stores。通过 Tauri IPC 通信。

**Tech Stack:** Rust, Vue 3, TypeScript, Pinia, Tauri, git2, Naive UI

**关键代码模式：**
- Rust 命令使用 `state.repos.clone()` + `tokio::task::spawn_blocking` 模式
- lib.rs 用 `generate_handler!` 显式注册命令

**依赖：** Task 8→9（Revert 服务→命令），Task 10→11（Rebase 服务→命令），Task 12 独立

**前置：** 需先完成 P0（`commands/merge.rs` 已由 Task 6 创建）

---

### Task 8: Revert - 后端服务

**Files:**
- Modify: `git-client/src-tauri/src/services/merge_service.rs`

- [ ] **Step 1: 追加 revert 函数**

```rust
pub fn revert(repo: &mut git2::Repository, commit_id: &str) -> Result<(), AppError> {
    let oid = git2::Oid::from_str(commit_id)?;
    let commit = repo.find_commit(oid)?;

    let mut opts = git2::RevertOptions::new();
    opts.mainline(0);

    repo.revert(&commit, Some(&mut opts))?;

    let index = repo.index()?;
    let had_conflicts = index.has_conflicts();
    if had_conflicts {
        return Err(AppError::Conflict(Vec::new()));
    }
    Ok(())
}
```

- [ ] **Step 2: 追加测试**

```rust
#[cfg(test)]
mod revert_tests {
    use super::*;
    use crate::services::repo_service;
    use tempfile::TempDir;

    fn setup_repo_with_two_commits() -> (TempDir, git2::Repository) {
        let dir = TempDir::new().unwrap();
        let path = dir.path().to_string_lossy().to_string();
        repo_service::init_repo(&path, false).unwrap();
        let repo = git2::Repository::open(&path).unwrap();
        let sig = repo.signature().unwrap();
        let workdir = repo.workdir().unwrap();

        std::fs::write(workdir.join("a.txt"), "line1").unwrap();
        let mut index = repo.index().unwrap();
        index.add_path(std::path::Path::new("a.txt")).unwrap();
        let tree_id = index.write_tree().unwrap();
        let tree = repo.find_tree(tree_id).unwrap();
        repo.commit(Some("HEAD"), &sig, &sig, "first", &tree, &[]).unwrap();

        std::fs::write(workdir.join("b.txt"), "line2").unwrap();
        index.add_path(std::path::Path::new("b.txt")).unwrap();
        let tree_id = index.write_tree().unwrap();
        let tree = repo.find_tree(tree_id).unwrap();
        let head = repo.head().unwrap().peel_to_commit().unwrap();
        repo.commit(Some("HEAD"), &sig, &sig, "second", &tree, &[&head]).unwrap();

        (dir, repo)
    }

    #[test]
    fn test_revert_without_conflicts() {
        let (dir, mut repo) = setup_repo_with_two_commits();
        let head = repo.head().unwrap().peel_to_commit().unwrap();
        let head_id = head.id().to_string();
        let result = revert(&mut repo, &head_id);
        assert!(result.is_ok());
        drop(repo);
        drop(dir);
    }
}
```

- [ ] **Step 3: 运行测试**

Run: `cd git-client/src-tauri && cargo test revert_tests`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add git-client/src-tauri/src/services/merge_service.rs
git commit -m "feat(merge): add revert service with test"
```

---

### Task 9: Revert - 后端命令

**Files:**
- Modify: `git-client/src-tauri/src/commands/merge.rs`
- Modify: `git-client/src-tauri/src/lib.rs`

- [ ] **Step 1: 追加 revert_commit 命令到 merge.rs**

```rust
#[tauri::command]
pub async fn revert_commit(
    state: State<'_, AppState>,
    repo_path: String,
    commit_id: String,
) -> Result<(), AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let mut repo = manager.get_repo(&repo_path)?;
        merge_service::revert(&mut repo, &commit_id)
    })
    .await?
}
```

- [ ] **Step 2: 更新 lib.rs `generate_handler!`，追加**

```rust
            commands::merge::revert_commit,
```

- [ ] **Step 3: 编译验证与 Commit**

Run: `cd git-client/src-tauri && cargo build`
Expected: SUCCESS

```bash
git add git-client/src-tauri/src/commands/merge.rs git-client/src-tauri/src/lib.rs
git commit -m "feat(merge): add revert command"
```

---

### Task 10: Rebase - 后端服务

**Files:**
- Modify: `git-client/src-tauri/src/services/branch_service.rs`

- [ ] **Step 1: 追加 rebase 函数**

```rust
pub fn rebase(repo: &mut git2::Repository, upstream: &str, branch: Option<&str>) -> Result<(), AppError> {
    let target_branch = match branch {
        Some(name) => {
            let b = repo.find_branch(name, git2::BranchType::Local)?;
            b.get().peel_to_commit()?
        }
        None => repo.head()?.peel_to_commit()?,
    };

    let upstream_annotated = repo.revparse_single(upstream)?;

    let mut rebase = repo.rebase(
        Some(&target_branch),
        Some(&upstream_annotated),
        None,
        None,
    )?;

    while let Some(operation) = rebase.next() {
        let _op = operation?;
        if let Err(e) = rebase.commit(None, &repo.signature()?, None) {
            rebase.abort()?;
            return Err(AppError::Git(e));
        }
    }

    rebase.finish(None)?;
    Ok(())
}
```

- [ ] **Step 2: 追加测试**

```rust
    #[test]
    fn test_rebase_simple() {
        let (dir, repo) = setup_repo_with_commit();
        let sig = repo.signature().unwrap();
        let workdir = repo.workdir().unwrap();

        create_branch(&repo, "feature", false).unwrap();

        std::fs::write(workdir.join("main_change.txt"), "main").unwrap();
        let mut index = repo.index().unwrap();
        index.add_path(std::path::Path::new("main_change.txt")).unwrap();
        let tree_id = index.write_tree().unwrap();
        let tree = repo.find_tree(tree_id).unwrap();
        let head = repo.head().unwrap().peel_to_commit().unwrap();
        repo.commit(Some("HEAD"), &sig, &sig, "main commit", &tree, &[&head]).unwrap();

        switch_branch(&repo, "feature").unwrap();
        std::fs::write(workdir.join("feature_change.txt"), "feature").unwrap();
        index.add_path(std::path::Path::new("feature_change.txt")).unwrap();
        let tree_id = index.write_tree().unwrap();
        let tree = repo.find_tree(tree_id).unwrap();
        let feat_head = repo.head().unwrap().peel_to_commit().unwrap();
        repo.commit(Some("HEAD"), &sig, &sig, "feature commit", &tree, &[&feat_head]).unwrap();

        drop(tree);
        let mut repo_mut = git2::Repository::open(&dir.path().to_string_lossy().to_string()).unwrap();
        rebase(&mut repo_mut, "main", Some("feature")).unwrap();
        drop(repo_mut);
        drop(repo);
        drop(dir);
    }
```

- [ ] **Step 3: 运行测试**

Run: `cd git-client/src-tauri && cargo test test_rebase_simple`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add git-client/src-tauri/src/services/branch_service.rs
git commit -m "feat(branch): add rebase service with test"
```

---

### Task 11: Rebase - 后端命令

**Files:**
- Modify: `git-client/src-tauri/src/commands/branch.rs`
- Modify: `git-client/src-tauri/src/lib.rs`

- [ ] **Step 1: 追加 rebase_branch 命令**

```rust
#[tauri::command]
pub async fn rebase_branch(
    state: State<'_, AppState>,
    repo_path: String,
    upstream: String,
    branch: Option<String>,
) -> Result<(), AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let mut repo = manager.get_repo(&repo_path)?;
        branch_service::rebase(&mut repo, &upstream, branch.as_deref())
    })
    .await?
}
```

- [ ] **Step 2: 更新 lib.rs `generate_handler!`，追加**

```rust
            commands::branch::rebase_branch,
```

- [ ] **Step 3: 编译验证与 Commit**

Run: `cd git-client/src-tauri && cargo build`
Expected: SUCCESS

```bash
git add git-client/src-tauri/src/commands/branch.rs git-client/src-tauri/src/lib.rs
git commit -m "feat(branch): add rebase command"
```

---

### Task 12: 高级远程操作

**Files:**
- Modify: `git-client/src-tauri/src/services/remote_service.rs`
- Modify: `git-client/src-tauri/src/commands/remote.rs`
- Modify: `git-client/src-tauri/src/lib.rs`

- [ ] **Step 1: 在 remote_service.rs 末尾追加两个函数**

```rust
pub fn remove_remote(repo: &git2::Repository, name: &str) -> Result<(), AppError> {
    repo.remote_delete(name)?;
    Ok(())
}

pub fn rename_remote(repo: &git2::Repository, old_name: &str, new_name: &str) -> Result<(), AppError> {
    repo.remote_rename(old_name, new_name)?;
    Ok(())
}
```

- [ ] **Step 2: 在 commands/remote.rs 末尾追加两个命令**

```rust
#[tauri::command]
pub async fn remove_remote(
    state: State<'_, AppState>,
    repo_path: String,
    name: String,
) -> Result<(), AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        remote_service::remove_remote(&repo, &name)
    })
    .await?
}

#[tauri::command]
pub async fn rename_remote(
    state: State<'_, AppState>,
    repo_path: String,
    old_name: String,
    new_name: String,
) -> Result<(), AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        remote_service::rename_remote(&repo, &old_name, &new_name)
    })
    .await?
}
```

- [ ] **Step 3: 更新 lib.rs `generate_handler!`，追加**

```rust
            commands::remote::remove_remote,
            commands::remote::rename_remote,
```

- [ ] **Step 4: 编译验证与 Commit**

Run: `cd git-client/src-tauri && cargo build`
Expected: SUCCESS

```bash
git add git-client/src-tauri/src/services/remote_service.rs git-client/src-tauri/src/commands/remote.rs git-client/src-tauri/src/lib.rs
git commit -m "feat(remote): add remove/rename remote operations"
```
