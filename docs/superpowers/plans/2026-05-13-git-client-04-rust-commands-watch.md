# Git客户端 实施计划 — 04: Rust IPC命令 + 文件监听

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现Tauri IPC命令层，注册所有命令到invoke_handler；实现notify文件监听，emit细分事件到前端

**Architecture:** commands层接收IPC调用，通过spawn_blocking调度services层（解决E1: git2同步阻塞问题）。AppState注入Tauri管理(E5)。文件监听(E11)仅监听.git/refs/、.git/HEAD、.git/index，emit细分事件(E7)。

**Tech Stack:** Tauri 2.x, tokio, notify, git2

---

### Task 1: 实现repo命令

**Files:**
- Modify: `src-tauri/src/commands/repo.rs`

- [ ] **Step 1: 写repo命令**

`src-tauri/src/commands/repo.rs`:
```rust
use crate::models::repo::RepoState;
use crate::services::repo_service;
use crate::utils::error::AppError;
use crate::AppState;
use std::sync::Mutex;
use tauri::State;

#[tauri::command]
pub async fn open_repo(
    state: State<'_, AppState>,
    path: String,
) -> Result<RepoState, AppError> {
    let repos = state.repos.clone();
    let path_clone = path.clone();
    tokio::task::spawn_blocking(move || {
        let repo_state = repo_service::open_repo(&path_clone)?;
        let mut manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        manager.open(&path_clone)?;
        Ok(repo_state)
    })
    .await?
}

#[tauri::command]
pub async fn init_repo(path: String, bare: bool) -> Result<RepoState, AppError> {
    tokio::task::spawn_blocking(move || repo_service::init_repo(&path, bare)).await?
}

#[tauri::command]
pub async fn clone_repo(url: String, path: String) -> Result<RepoState, AppError> {
    tokio::task::spawn_blocking(move || repo_service::clone_repo(&url, &path)).await?
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
git add src-tauri/src/commands/repo.rs
git commit -m "feat: add repo IPC commands (open/init/clone) with spawn_blocking"
```

---

### Task 2: 实现commit命令

**Files:**
- Modify: `src-tauri/src/commands/commit.rs`

- [ ] **Step 1: 写commit命令**

`src-tauri/src/commands/commit.rs`:
```rust
use crate::models::commit::Commit;
use crate::services::commit_service;
use crate::utils::error::AppError;
use crate::AppState;
use tauri::State;

#[tauri::command]
pub async fn get_log(
    state: State<'_, AppState>,
    repo_path: String,
    limit: u32,
    after: Option<String>,
) -> Result<Vec<Commit>, AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        commit_service::log(&repo, limit, after.as_deref())
    })
    .await?
}

#[tauri::command]
pub async fn commit(
    state: State<'_, AppState>,
    repo_path: String,
    message: String,
    amend: bool,
) -> Result<Commit, AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        commit_service::create_commit(&repo, &message, amend)
    })
    .await?
}
```

- [ ] **Step 2: 编译验证**

Run:
```powershell
cd d:\projects\req2task-2\git-client\src-tauri
cargo check
```

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/commands/commit.rs
git commit -m "feat: add commit IPC commands (get_log/commit) with spawn_blocking"
```

---

### Task 3: 实现branch命令

**Files:**
- Modify: `src-tauri/src/commands/branch.rs`

- [ ] **Step 1: 写branch命令**

`src-tauri/src/commands/branch.rs`:
```rust
use crate::models::branch::Branch;
use crate::services::branch_service;
use crate::utils::error::AppError;
use crate::AppState;
use tauri::State;

#[tauri::command]
pub async fn list_branches(
    state: State<'_, AppState>,
    repo_path: String,
) -> Result<Vec<Branch>, AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        branch_service::list_branches(&repo)
    })
    .await?
}

#[tauri::command]
pub async fn create_branch(
    state: State<'_, AppState>,
    repo_path: String,
    name: String,
    checkout: bool,
) -> Result<Branch, AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        branch_service::create_branch(&repo, &name, checkout)
    })
    .await?
}

#[tauri::command]
pub async fn switch_branch(
    state: State<'_, AppState>,
    repo_path: String,
    name: String,
) -> Result<(), AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        branch_service::switch_branch(&repo, &name)
    })
    .await?
}

#[tauri::command]
pub async fn delete_branch(
    state: State<'_, AppState>,
    repo_path: String,
    name: String,
    force: bool,
) -> Result<(), AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        branch_service::delete_branch(&repo, &name, force)
    })
    .await?
}
```

- [ ] **Step 2: 编译验证**

Run:
```powershell
cd d:\projects\req2task-2\git-client\src-tauri
cargo check
```

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/commands/branch.rs
git commit -m "feat: add branch IPC commands (list/create/switch/delete)"
```

---

### Task 4: 实现remote + diff + stash命令

**Files:**
- Modify: `src-tauri/src/commands/remote.rs`
- Modify: `src-tauri/src/commands/diff.rs`
- Modify: `src-tauri/src/commands/stash.rs`

- [ ] **Step 1: 写remote命令**

`src-tauri/src/commands/remote.rs`:
```rust
use crate::models::remote::RemoteInfo;
use crate::services::remote_service;
use crate::utils::error::AppError;
use crate::AppState;
use tauri::State;

#[tauri::command]
pub async fn list_remotes(
    state: State<'_, AppState>,
    repo_path: String,
) -> Result<Vec<RemoteInfo>, AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        remote_service::list_remotes(&repo)
    })
    .await?
}

#[tauri::command]
pub async fn add_remote(
    state: State<'_, AppState>,
    repo_path: String,
    name: String,
    url: String,
) -> Result<(), AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        remote_service::add_remote(&repo, &name, &url)
    })
    .await?
}

#[tauri::command]
pub async fn fetch(
    state: State<'_, AppState>,
    repo_path: String,
    remote: String,
) -> Result<remote_service::FetchResult, AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        remote_service::fetch(&repo, &remote)
    })
    .await?
}

#[tauri::command]
pub async fn pull(
    state: State<'_, AppState>,
    repo_path: String,
    remote: String,
    branch: String,
) -> Result<remote_service::PullResult, AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        remote_service::pull(&repo, &remote, &branch)
    })
    .await?
}

#[tauri::command]
pub async fn push(
    state: State<'_, AppState>,
    repo_path: String,
    remote: String,
    branch: String,
) -> Result<remote_service::PushResult, AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        remote_service::push(&repo, &remote, &branch)
    })
    .await?
}
```

- [ ] **Step 2: 写diff命令**

`src-tauri/src/commands/diff.rs`:
```rust
use crate::models::diff::FileDiff;
use crate::services::diff_service;
use crate::services::merge_service;
use crate::utils::error::AppError;
use crate::AppState;
use tauri::State;

#[tauri::command]
pub async fn get_diff(
    state: State<'_, AppState>,
    repo_path: String,
    commit_id: String,
) -> Result<Vec<FileDiff>, AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        diff_service::get_commit_diff(&repo, &commit_id)
    })
    .await?
}

#[tauri::command]
pub async fn get_working_diff(
    state: State<'_, AppState>,
    repo_path: String,
) -> Result<Vec<FileDiff>, AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        diff_service::get_working_diff(&repo)
    })
    .await?
}

#[tauri::command]
pub async fn get_staged_diff(
    state: State<'_, AppState>,
    repo_path: String,
) -> Result<Vec<FileDiff>, AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        diff_service::get_staged_diff(&repo)
    })
    .await?
}

#[tauri::command]
pub async fn stage_files(
    state: State<'_, AppState>,
    repo_path: String,
    paths: Vec<String>,
) -> Result<(), AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        diff_service::stage_files(&repo, &paths)
    })
    .await?
}

#[tauri::command]
pub async fn unstage_files(
    state: State<'_, AppState>,
    repo_path: String,
    paths: Vec<String>,
) -> Result<(), AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        diff_service::unstage_files(&repo, &paths)
    })
    .await?
}

#[tauri::command]
pub async fn resolve_conflict(
    state: State<'_, AppState>,
    repo_path: String,
    path: String,
    content: String,
) -> Result<(), AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        merge_service::resolve_conflict(&repo, &path, &content)
    })
    .await?
}
```

- [ ] **Step 3: 写stash命令**

`src-tauri/src/commands/stash.rs`:
```rust
use crate::models::stash::{Credential, StashEntry};
use crate::services::stash_service;
use crate::utils::credential;
use crate::utils::error::AppError;
use crate::AppState;
use tauri::State;

#[tauri::command]
pub async fn stash_save(
    state: State<'_, AppState>,
    repo_path: String,
    message: String,
) -> Result<StashEntry, AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        stash_service::stash_save(&repo, &message)
    })
    .await?
}

#[tauri::command]
pub async fn stash_list(
    state: State<'_, AppState>,
    repo_path: String,
) -> Result<Vec<StashEntry>, AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        stash_service::stash_list(&repo)
    })
    .await?
}

#[tauri::command]
pub async fn stash_pop(
    state: State<'_, AppState>,
    repo_path: String,
    index: u32,
) -> Result<(), AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        stash_service::stash_pop(&repo, index)
    })
    .await?
}

#[tauri::command]
pub async fn get_credentials(remote: String) -> Result<Credential, AppError> {
    tokio::task::spawn_blocking(move || credential::get_credential(&remote)).await?
}

#[tauri::command]
pub async fn set_credentials(remote: String, cred: Credential) -> Result<(), AppError> {
    tokio::task::spawn_blocking(move || credential::set_credential(&remote, &cred)).await?
}
```

- [ ] **Step 4: 编译验证**

Run:
```powershell
cd d:\projects\req2task-2\git-client\src-tauri
cargo check
```

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/commands/
git commit -m "feat: add remote/diff/stash/credential IPC commands"
```

---

### Task 5: 注册所有命令到Tauri

**Files:**
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: 更新lib.rs注册命令**

`src-tauri/src/lib.rs` 中 `run()` 函数修改为：

```rust
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let state = AppState {
        repos: Arc::new(Mutex::new(RepoManager::new())),
    };
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            commands::repo::open_repo,
            commands::repo::init_repo,
            commands::repo::clone_repo,
            commands::commit::get_log,
            commands::commit::commit,
            commands::branch::list_branches,
            commands::branch::create_branch,
            commands::branch::switch_branch,
            commands::branch::delete_branch,
            commands::remote::list_remotes,
            commands::remote::add_remote,
            commands::remote::fetch,
            commands::remote::pull,
            commands::remote::push,
            commands::diff::get_diff,
            commands::diff::get_working_diff,
            commands::diff::get_staged_diff,
            commands::diff::stage_files,
            commands::diff::unstage_files,
            commands::diff::resolve_conflict,
            commands::stash::stash_save,
            commands::stash::stash_list,
            commands::stash::stash_pop,
            commands::stash::get_credentials,
            commands::stash::set_credentials,
        ])
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
git commit -m "feat: register all IPC commands in Tauri invoke_handler"
```

---

### Task 6: 实现notify文件监听

**Files:**
- Create: `src-tauri/src/watcher.rs`

- [ ] **Step 1: 写文件监听模块**

`src-tauri/src/watcher.rs`:
```rust
use notify::{Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::PathBuf;
use std::sync::mpsc;
use tauri::{AppHandle, Emitter};

pub fn start_watcher(app: AppHandle, repo_path: String) -> Result<RecommendedWatcher, notify::Error> {
    let (tx, rx) = mpsc::channel();
    let mut watcher = RecommendedWatcher::new(
        move |res: Result<Event, notify::Error>| {
            if let Ok(event) = res {
                let _ = tx.send(event);
            }
        },
        Config::default(),
    )?;

    let git_dir = PathBuf::from(&repo_path).join(".git");
    let refs_dir = git_dir.join("refs");
    let head_path = git_dir.join("HEAD");
    let index_path = git_dir.join("index");

    watcher.watch(&refs_dir, RecursiveMode::Recursive)?;
    watcher.watch(git_dir.join("HEAD").parent().unwrap(), RecursiveMode::NonRecursive)?;

    let app_clone = app.clone();
    std::thread::spawn(move || {
        while let Ok(event) = rx.recv() {
            let path = event.paths.first();
            match event.kind {
                EventKind::Modify(_) | EventKind::Create(_) | EventKind::Remove(_) => {
                    if let Some(p) = path {
                        if p.starts_with(&refs_dir) {
                            let _ = app_clone.emit("ref-updated", ());
                        } else if p == &head_path {
                            let _ = app_clone.emit("head-changed", ());
                        } else if p == &index_path {
                            let _ = app_clone.emit("index-changed", ());
                        } else {
                            let _ = app_clone.emit("workdir-changed", ());
                        }
                    }
                }
                _ => {}
            }
        }
    });

    Ok(watcher)
}
```

- [ ] **Step 2: 修改lib.rs引入watcher模块**

在 `src-tauri/src/lib.rs` 顶部添加：
```rust
pub mod watcher;
```

在 `run()` 中，启动后注册setup hook：
```rust
.setup(|app| {
    Ok(())
})
```

暂时不在setup中启动监听，等前端传入repo_path后再启动。

- [ ] **Step 3: 编译验证**

Run:
```powershell
cd d:\projects\req2task-2\git-client\src-tauri
cargo check
```

Expected: 编译成功

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/watcher.rs src-tauri/src/lib.rs
git commit -m "feat: add file watcher with notify, emit granular events (E7/E11)"
```

---

### Task 7: 添加start_watch/stop_watch命令

**Files:**
- Modify: `src-tauri/src/commands/repo.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: 添加watch命令**

在 `src-tauri/src/commands/repo.rs` 添加：

```rust
use crate::watcher;
use std::sync::Mutex;
use tauri::AppHandle;

#[tauri::command]
pub async fn start_watch(
    app: AppHandle,
    state: State<'_, AppState>,
    repo_path: String,
) -> Result<(), AppError> {
    let watcher = watcher::start_watcher(app, repo_path)
        .map_err(|e| AppError::Credential(e.to_string()))?;
    let mut watches = state.watches.lock()
        .map_err(|e| AppError::Credential(e.to_string()))?;
    watches.insert(repo_path.clone(), watcher);
    Ok(())
}
```

需要在 `AppState` 中添加 `watches` 字段：

`src-tauri/src/lib.rs` 中修改：
```rust
use notify::RecommendedWatcher;
use std::collections::HashMap;

pub struct AppState {
    pub repos: Arc<Mutex<RepoManager>>,
    pub watches: Arc<Mutex<HashMap<String, RecommendedWatcher>>>,
}
```

`run()` 中：
```rust
let state = AppState {
    repos: Arc::new(Mutex::new(RepoManager::new())),
    watches: Arc::new(Mutex::new(HashMap::new())),
};
```

在invoke_handler中添加 `commands::repo::start_watch`。

- [ ] **Step 2: 编译验证**

Run:
```powershell
cd d:\projects\req2task-2\git-client\src-tauri
cargo check
```

Expected: 编译成功

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/commands/repo.rs src-tauri/src/lib.rs
git commit -m "feat: add start_watch command for file watcher lifecycle"
```

---

### Task 8: 配置tracing日志

**Files:**
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: 在run()中初始化tracing**

`src-tauri/src/lib.rs` 中 `run()` 函数开头添加：

```rust
use tracing_subscriber::EnvFilter;

let log_dir = app_data_dir.unwrap_or_else(|| PathBuf::from("."));
let file_appender = tracing_appender::rolling::RollingFileAppender::new(
    tracing_appender::rolling::Rotation::HOURLY,
    log_dir.join("logs"),
    "git-client.log",
);
let (non_blocking, _guard) = tracing_appender::non_blocking(file_appender);
tracing_subscriber::fmt()
    .with_env_filter(EnvFilter::from_default_env().add_directive("info".parse().unwrap()))
    .with_writer(non_blocking)
    .init();
```

注意：需要在setup中初始化日志，因为需要app_data_dir。修改为：

```rust
.setup(|app| {
    let log_dir = app.path().app_data_dir()
        .expect("failed to get app data dir");
    std::fs::create_dir_all(&log_dir).expect("failed to create log dir");
    let file_appender = tracing_appender::rolling::RollingFileAppender::new(
        tracing_appender::rolling::Rotation::HOURLY,
        log_dir.join("logs"),
        "git-client.log",
    );
    let (non_blocking, _guard) = tracing_appender::non_blocking(file_appender);
    tracing_subscriber::fmt()
        .with_env_filter(
            EnvFilter::from_default_env().add_directive("info".parse().unwrap())
        )
        .with_writer(non_blocking)
        .init();
    Ok(())
})
```

- [ ] **Step 2: 编译验证**

Run:
```powershell
cd d:\projects\req2task-2\git-client\src-tauri
cargo check
```

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/lib.rs
git commit -m "feat: initialize tracing with rolling file appender"
```
