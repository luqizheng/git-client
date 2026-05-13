# Task 8: Rust 后端 cherry_pick / rebase / reset 命令

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** 实现 Rust 后端三个新 IPC 命令：cherry_pick、rebase_onto、reset_commit

**Architecture:** 新增 3 个 command 文件 + 对应 service 函数，注册到 Tauri invoke_handler

**Tech Stack:** Rust, git2, Tauri 2

**Depends:** Task 0（CommitRef 类型，确保已有 ConflictFile 类型）

---

**Files:**
- Create: `src-tauri/src/commands/cherry_pick.rs`
- Create: `src-tauri/src/commands/rebase.rs`
- Create: `src-tauri/src/commands/reset.rs`
- Modify: `src-tauri/src/commands/mod.rs`
- Modify: `src-tauri/src/lib.rs`
- Create: `src-tauri/src/services/cherry_pick_service.rs`
- Create: `src-tauri/src/services/rebase_service.rs`
- Create: `src-tauri/src/services/reset_service.rs`
- Modify: `src-tauri/src/services/mod.rs`

- [ ] **Step 1: 创建 reset_service.rs（最简单，先实现）**

```rust
use crate::utils::error::AppError;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ResetMode {
    Soft,
    Mixed,
    Hard,
}

pub fn reset(
    repo: &git2::Repository,
    commit_id: &str,
    mode: ResetMode,
) -> Result<(), AppError> {
    let oid = git2::Oid::from_str(commit_id)?;
    let commit = repo.find_commit(oid)?;
    let obj = commit.as_object();

    let reset_type = match mode {
        ResetMode::Soft => git2::ResetType::Soft,
        ResetMode::Mixed => git2::ResetType::Mixed,
        ResetMode::Hard => git2::ResetType::Hard,
    };

    repo.reset(obj, reset_type, None)?;
    Ok(())
}
```

- [ ] **Step 2: 创建 reset.rs 命令**

```rust
use crate::services::reset_service::ResetMode;
use crate::utils::error::AppError;
use crate::AppState;
use tauri::State;

#[tauri::command]
pub async fn reset_commit(
    state: State<'_, AppState>,
    repo_path: String,
    commit_id: String,
    mode: ResetMode,
) -> Result<(), AppError> {
    let mut manager = state.manager.lock().await;
    let repo = manager.get_repo(&repo_path)?;
    reset_service::reset(repo, &commit_id, mode)
}

use crate::services::reset_service;
```

- [ ] **Step 3: 创建 cherry_pick_service.rs**

```rust
use crate::models::commit::Commit;
use crate::utils::error::AppError;

pub fn cherry_pick(
    repo: &mut git2::Repository,
    commit_id: &str,
) -> Result<Commit, AppError> {
    let oid = git2::Oid::from_str(commit_id)?;
    let commit = repo.find_commit(oid)?;

    repo.cherrypick(&commit, None)?;

    let head = repo.head()?;
    let new_commit = head.peel_to_commit()?;

    let id = new_commit.id().to_string();
    let message = new_commit.message().unwrap_or("").to_string();
    let author = new_commit.author().name().unwrap_or("").to_string();
    let author_email = new_commit.author().email().unwrap_or("").to_string();
    let time = new_commit.time().seconds();
    let parent_ids: Vec<String> = new_commit.parent_ids().map(|p| p.to_string()).collect();

    Ok(Commit {
        id,
        message,
        author,
        author_email,
        time,
        parent_ids,
        refs: vec![],
    })
}
```

- [ ] **Step 4: 创建 cherry_pick.rs 命令**

```rust
use crate::models::commit::Commit;
use crate::utils::error::AppError;
use crate::AppState;
use tauri::State;

#[tauri::command]
pub async fn cherry_pick(
    state: State<'_, AppState>,
    repo_path: String,
    commit_id: String,
) -> Result<Commit, AppError> {
    let mut manager = state.manager.lock().await;
    let repo = manager.get_repo_mut(&repo_path)?;
    cherry_pick_service::cherry_pick(repo, &commit_id)
}

use crate::services::cherry_pick_service;
```

- [ ] **Step 5: 创建 rebase_service.rs**

```rust
use crate::utils::error::AppError;
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct RebaseResult {
    pub success: bool,
    pub new_head_id: Option<String>,
}

pub fn rebase_onto(
    repo: &mut git2::Repository,
    branch_name: &str,
    upstream_commit_id: &str,
) -> Result<RebaseResult, AppError> {
    let upstream_oid = git2::Oid::from_str(upstream_commit_id)?;
    let upstream_commit = repo.find_commit(upstream_oid)?;

    let branch_ref = repo.find_branch(branch_name, git2::BranchType::Local)?;
    let branch_target = branch_ref.get().target().ok_or_else(|| {
        AppError::Git("Branch has no target".to_string())
    })?;
    let branch_commit = repo.find_commit(branch_target)?;

    let mut rebase = repo.rebase(
        Some(&branch_commit.as_object().peel(git2::ObjectType::Commit)?),
        Some(&upstream_commit.as_object().peel(git2::ObjectType::Commit)?),
        None,
        None,
    )?;

    let sig = repo.signature()?;

    while let Some(op) = rebase.next() {
        let _op = op.map_err(|e| AppError::Git(format!("Rebase step failed: {}", e)))?;
        if repo.index()?.has_conflicts() {
            rebase.abort()?;
            return Ok(RebaseResult {
                success: false,
                new_head_id: None,
            });
        }
        let oid = rebase.commit(None, &sig, None)?;
    }

    rebase.finish(None)?;

    let head = repo.head()?;
    let new_head_id = head.target().map(|oid| oid.to_string());

    Ok(RebaseResult {
        success: true,
        new_head_id,
    })
}
```

- [ ] **Step 6: 创建 rebase.rs 命令**

```rust
use crate::services::rebase_service::RebaseResult;
use crate::utils::error::AppError;
use crate::AppState;
use tauri::State;

#[tauri::command]
pub async fn rebase_onto(
    state: State<'_, AppState>,
    repo_path: String,
    branch_name: String,
    upstream_commit_id: String,
) -> Result<RebaseResult, AppError> {
    let mut manager = state.manager.lock().await;
    let repo = manager.get_repo_mut(&repo_path)?;
    rebase_service::rebase_onto(repo, &branch_name, &upstream_commit_id)
}

use crate::services::rebase_service;
```

- [ ] **Step 7: 注册 commands 和 services**

修改 `src-tauri/src/commands/mod.rs`，添加：
```rust
pub mod cherry_pick;
pub mod rebase;
pub mod reset;
```

修改 `src-tauri/src/services/mod.rs`，添加：
```rust
pub mod cherry_pick_service;
pub mod rebase_service;
pub mod reset_service;
```

修改 `src-tauri/src/lib.rs`，在 `invoke_handler` 中注册新命令：
```rust
.invoke_handler(tauri::generate_handler![
    // ... 现有命令 ...
    commands::cherry_pick::cherry_pick,
    commands::rebase::rebase_onto,
    commands::reset::reset_commit,
])
```

- [ ] **Step 8: 验证 Rust 编译**

Run: `cd d:\projects\req2task-2\git-client\src-tauri; cargo build`

Expected: 成功

- [ ] **Step 9: Commit**

```bash
git add src-tauri/src/
git commit -m "feat: add cherry_pick, rebase, and reset Rust commands"
```
