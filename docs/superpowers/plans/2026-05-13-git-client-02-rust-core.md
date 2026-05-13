# Git客户端 实施计划 — 02: Rust核心 (模型/错误/AppState)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现Rust后端核心数据模型、统一错误类型、AppState/RepoManager、凭证工具、重试工具

**Architecture:** models层定义纯数据结构(serde序列化)，utils/error.rs定义AppError统一错误处理，AppState通过Arc<Mutex<RepoManager>>管理仓库状态，每次操作重新open repository。

**Tech Stack:** Rust, git2, serde, thiserror, keyring, tokio

---

### Task 1: 实现数据模型 — commit + repo

**Files:**
- Modify: `src-tauri/src/models/commit.rs`
- Modify: `src-tauri/src/models/repo.rs`

- [ ] **Step 1: 写commit模型测试**

`src-tauri/src/models/commit.rs`:
```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Commit {
    pub id: String,
    pub message: String,
    pub author: String,
    pub author_email: String,
    pub time: i64,
    pub parent_ids: Vec<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_commit_serialize_deserialize() {
        let commit = Commit {
            id: "abc123".to_string(),
            message: "init".to_string(),
            author: "user".to_string(),
            author_email: "user@example.com".to_string(),
            time: 1700000000,
            parent_ids: vec!["parent1".to_string()],
        };
        let json = serde_json::to_string(&commit).unwrap();
        let parsed: Commit = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed, commit);
    }
}
```

- [ ] **Step 2: 写repo模型测试**

`src-tauri/src/models/repo.rs`:
```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct RepoState {
    pub path: String,
    pub head_branch: Option<String>,
    pub head_commit_id: Option<String>,
    pub is_bare: bool,
    pub is_empty: bool,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_repo_state_serialize() {
        let state = RepoState {
            path: "/tmp/repo".to_string(),
            head_branch: Some("main".to_string()),
            head_commit_id: Some("abc123".to_string()),
            is_bare: false,
            is_empty: false,
        };
        let json = serde_json::to_string(&state).unwrap();
        let parsed: RepoState = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed, state);
    }
}
```

- [ ] **Step 3: 运行测试**

Run:
```powershell
cd d:\projects\req2task-2\git-client\src-tauri
cargo test models::commit::tests models::repo::tests --lib
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/models/commit.rs src-tauri/src/models/repo.rs
git commit -m "feat: add Commit and RepoState models with tests"
```

---

### Task 2: 实现数据模型 — branch + diff

**Files:**
- Modify: `src-tauri/src/models/branch.rs`
- Modify: `src-tauri/src/models/diff.rs`

- [ ] **Step 1: 写branch模型**

`src-tauri/src/models/branch.rs`:
```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Branch {
    pub name: String,
    pub is_remote: bool,
    pub is_head: bool,
    pub target_commit_id: String,
    pub upstream: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_branch_serialize() {
        let branch = Branch {
            name: "main".to_string(),
            is_remote: false,
            is_head: true,
            target_commit_id: "abc123".to_string(),
            upstream: Some("origin/main".to_string()),
        };
        let json = serde_json::to_string(&branch).unwrap();
        let parsed: Branch = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed, branch);
    }
}
```

- [ ] **Step 2: 写diff模型**

`src-tauri/src/models/diff.rs`:
```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct FileDiff {
    pub path: String,
    pub old_path: Option<String>,
    pub status: DiffStatus,
    pub hunks: Vec<Hunk>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum DiffStatus {
    Added,
    Modified,
    Deleted,
    Renamed,
    Copied,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Hunk {
    pub old_start: u32,
    pub old_lines: u32,
    pub new_start: u32,
    pub new_lines: u32,
    pub lines: Vec<DiffLine>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum DiffLine {
    Context(String),
    Addition(String),
    Deletion(String),
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_file_diff_roundtrip() {
        let diff = FileDiff {
            path: "src/main.rs".to_string(),
            old_path: None,
            status: DiffStatus::Modified,
            hunks: vec![Hunk {
                old_start: 1,
                old_lines: 3,
                new_start: 1,
                new_lines: 4,
                lines: vec![
                    DiffLine::Context("fn main()".to_string()),
                    DiffLine::Addition("    println!(\"hello\")".to_string()),
                    DiffLine::Deletion("    println!(\"hi\")".to_string()),
                ],
            }],
        };
        let json = serde_json::to_string(&diff).unwrap();
        let parsed: FileDiff = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed, diff);
    }
}
```

- [ ] **Step 3: 运行测试**

Run:
```powershell
cd d:\projects\req2task-2\git-client\src-tauri
cargo test models::branch::tests models::diff::tests --lib
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/models/branch.rs src-tauri/src/models/diff.rs
git commit -m "feat: add Branch and FileDiff models with tests"
```

---

### Task 3: 实现数据模型 — remote + stash + ConflictFile + Credential

**Files:**
- Modify: `src-tauri/src/models/remote.rs`
- Modify: `src-tauri/src/models/stash.rs`

- [ ] **Step 1: 写remote模型**

`src-tauri/src/models/remote.rs`:
```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct RemoteInfo {
    pub name: String,
    pub url: String,
    pub push_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ConflictFile {
    pub path: String,
    pub ours_modified: bool,
    pub theirs_modified: bool,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_remote_info_roundtrip() {
        let remote = RemoteInfo {
            name: "origin".to_string(),
            url: "https://github.com/user/repo.git".to_string(),
            push_url: None,
        };
        let json = serde_json::to_string(&remote).unwrap();
        let parsed: RemoteInfo = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed, remote);
    }

    #[test]
    fn test_conflict_file_roundtrip() {
        let cf = ConflictFile {
            path: "src/main.rs".to_string(),
            ours_modified: true,
            theirs_modified: true,
        };
        let json = serde_json::to_string(&cf).unwrap();
        let parsed: ConflictFile = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed, cf);
    }
}
```

- [ ] **Step 2: 写stash模型**

`src-tauri/src/models/stash.rs`:
```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct StashEntry {
    pub index: u32,
    pub message: String,
    pub commit_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Credential {
    pub username: String,
    pub password: Option<String>,
    pub ssh_key_path: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_stash_entry_roundtrip() {
        let entry = StashEntry {
            index: 0,
            message: "WIP on main".to_string(),
            commit_id: "def456".to_string(),
        };
        let json = serde_json::to_string(&entry).unwrap();
        let parsed: StashEntry = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed, entry);
    }

    #[test]
    fn test_credential_serialization() {
        let cred = Credential {
            username: "git".to_string(),
            password: Some("token123".to_string()),
            ssh_key_path: Some("~/.ssh/id_rsa".to_string()),
        };
        let json = serde_json::to_string(&cred).unwrap();
        let parsed: Credential = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed, cred);
    }
}
```

- [ ] **Step 3: 运行全部模型测试**

Run:
```powershell
cd d:\projects\req2task-2\git-client\src-tauri
cargo test models --lib
```

Expected: ALL PASS

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/models/remote.rs src-tauri/src/models/stash.rs
git commit -m "feat: add RemoteInfo, ConflictFile, StashEntry, Credential models with tests"
```

---

### Task 4: 实现AppError统一错误类型

**Files:**
- Modify: `src-tauri/src/utils/error.rs`

- [ ] **Step 1: 写AppError**

`src-tauri/src/utils/error.rs`:
```rust
use crate::models::remote::ConflictFile;
use serde::Serialize;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("Git error: {0}")]
    Git(#[from] git2::Error),
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Credential error: {0}")]
    Credential(String),
    #[error("Merge conflict: {0} files")]
    Conflict(Vec<ConflictFile>),
    #[error("Not a repository: {0}")]
    NotARepo(String),
    #[error("Branch not found: {0}")]
    BranchNotFound(String),
    #[error("Remote not found: {0}")]
    RemoteNotFound(String),
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(self.to_string().as_str())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_app_error_git() {
        let err = AppError::NotARepo("/tmp/empty".to_string());
        assert_eq!(err.to_string(), "Not a repository: /tmp/empty");
    }

    #[test]
    fn test_app_error_conflict() {
        let files = vec![ConflictFile {
            path: "main.rs".to_string(),
            ours_modified: true,
            theirs_modified: false,
        }];
        let err = AppError::Conflict(files);
        assert!(err.to_string().contains("1 files"));
    }

    #[test]
    fn test_app_error_serialize() {
        let err = AppError::Credential("bad token".to_string());
        let json = serde_json::to_string(&err).unwrap();
        assert!(json.contains("Credential error: bad token"));
    }
}
```

- [ ] **Step 2: 运行测试**

Run:
```powershell
cd d:\projects\req2task-2\git-client\src-tauri
cargo test utils::error::tests --lib
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/utils/error.rs
git commit -m "feat: add AppError unified error type with Serialize and tests"
```

---

### Task 5: 实现AppState + RepoManager

**Files:**
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: 写AppState和RepoManager**

在 `src-tauri/src/lib.rs` 中添加：

```rust
pub mod commands;
pub mod models;
pub mod services;
pub mod utils;

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

pub struct AppState {
    pub repos: Arc<Mutex<RepoManager>>,
}

pub struct RepoManager {
    handles: HashMap<PathBuf, RepoHandle>,
}

pub struct RepoHandle {
    pub path: PathBuf,
}

impl RepoManager {
    pub fn new() -> Self {
        RepoManager {
            handles: HashMap::new(),
        }
    }

    pub fn open(&mut self, path: &str) -> Result<(), utils::error::AppError> {
        let path_buf = PathBuf::from(path);
        let repo = git2::Repository::open(&path_buf)?;
        let head = repo.head();
        let _ = head;
        self.handles.insert(
            path_buf.clone(),
            RepoHandle { path: path_buf },
        );
        Ok(())
    }

    pub fn get_repo(&self, path: &str) -> Result<git2::Repository, utils::error::AppError> {
        let path_buf = PathBuf::from(path);
        if !self.handles.contains_key(&path_buf) {
            return Err(utils::error::AppError::NotARepo(path.to_string()));
        }
        let repo = git2::Repository::open(&path_buf)?;
        Ok(repo)
    }

    pub fn close(&mut self, path: &str) {
        self.handles.remove(&PathBuf::from(path));
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let state = AppState {
        repos: Arc::new(Mutex::new(RepoManager::new())),
    };
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(state)
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 2: 编译验证**

Run:
```powershell
cd d:\projects\req2task-2\git-client\src-tauri
cargo check
```

Expected: 编译成功

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/lib.rs
git commit -m "feat: add AppState, RepoManager, RepoHandle for repository lifecycle management"
```

---

### Task 6: 实现retry工具

**Files:**
- Modify: `src-tauri/src/utils/retry.rs`

- [ ] **Step 1: 写retry工具和测试**

`src-tauri/src/utils/retry.rs`:
```rust
use crate::utils::error::AppError;
use std::thread;
use std::time::Duration;

pub fn with_retry<F, T>(op: F, max_retries: u32) -> Result<T, AppError>
where
    F: Fn() -> Result<T, AppError>,
{
    let mut attempts = 0;
    loop {
        match op() {
            Ok(v) => return Ok(v),
            Err(e) if attempts < max_retries => {
                attempts += 1;
                thread::sleep(Duration::from_millis(100 * 2u64.pow(attempts)));
            }
            Err(e) => return Err(e),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicU32, Ordering};
    use std::sync::Arc;

    #[test]
    fn test_retry_success_first_try() {
        let result = with_retry(|| Ok(42), 3);
        assert_eq!(result.unwrap(), 42);
    }

    #[test]
    fn test_retry_succeeds_after_failures() {
        let attempts = Arc::new(AtomicU32::new(0));
        let attempts_clone = attempts.clone();
        let result = with_retry(
            move || {
                let n = attempts_clone.fetch_add(1, Ordering::SeqCst);
                if n < 2 {
                    Err(AppError::Credential("retry".to_string()))
                } else {
                    Ok(99)
                }
            },
            3,
        );
        assert_eq!(result.unwrap(), 99);
        assert_eq!(attempts.load(Ordering::SeqCst), 3);
    }

    #[test]
    fn test_retry_exhausted() {
        let result: Result<i32, AppError> = with_retry(
            || Err(AppError::Credential("fail".to_string())),
            2,
        );
        assert!(result.is_err());
    }
}
```

- [ ] **Step 2: 运行测试**

Run:
```powershell
cd d:\projects\req2task-2\git-client\src-tauri
cargo test utils::retry::tests --lib
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/utils/retry.rs
git commit -m "feat: add with_retry utility with exponential backoff and tests"
```

---

### Task 7: 实现credential工具

**Files:**
- Modify: `src-tauri/src/utils/credential.rs`

- [ ] **Step 1: 写credential工具**

`src-tauri/src/utils/credential.rs`:
```rust
use crate::models::stash::Credential;
use crate::utils::error::AppError;

fn service_name() -> &'static str {
    "git-client"
}

pub fn get_credential(remote: &str) -> Result<Credential, AppError> {
    let entry = keyring::Entry::new(service_name(), remote)
        .map_err(|e| AppError::Credential(e.to_string()))?;
    let data = entry
        .get_password()
        .map_err(|e| AppError::Credential(e.to_string()))?;
    let cred: Credential = serde_json::from_str(&data)
        .map_err(|e| AppError::Credential(e.to_string()))?;
    Ok(cred)
}

pub fn set_credential(remote: &str, cred: &Credential) -> Result<(), AppError> {
    let entry = keyring::Entry::new(service_name(), remote)
        .map_err(|e| AppError::Credential(e.to_string()))?;
    let data = serde_json::to_string(cred)
        .map_err(|e| AppError::Credential(e.to_string()))?;
    entry
        .set_password(&data)
        .map_err(|e| AppError::Credential(e.to_string()))?;
    Ok(())
}

pub fn delete_credential(remote: &str) -> Result<(), AppError> {
    let entry = keyring::Entry::new(service_name(), remote)
        .map_err(|e| AppError::Credential(e.to_string()))?;
    entry
        .delete_credential()
        .map_err(|e| AppError::Credential(e.to_string()))?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_credential_serialization() {
        let cred = Credential {
            username: "git".to_string(),
            password: Some("token".to_string()),
            ssh_key_path: Some("~/.ssh/id_ed25519".to_string()),
        };
        let json = serde_json::to_string(&cred).unwrap();
        let parsed: Credential = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.username, "git");
    }
}
```

- [ ] **Step 2: 运行测试**

Run:
```powershell
cd d:\projects\req2task-2\git-client\src-tauri
cargo test utils::credential::tests --lib
```

Expected: PASS（仅测试序列化，不测试真实keyring操作）

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/utils/credential.rs
git commit -m "feat: add credential get/set/delete using OS keyring"
```
