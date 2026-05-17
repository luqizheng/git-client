# Task 24: Hook Management — Backend

> **Phase:** 4 — P3 Enhancement | **Dependencies:** none
> **Plan origin:** `docs/superpowers/plans/2026-05-17-git-client-features-implementation.md`

**Files:**
- Create: `git-client/src-tauri/src/services/hook_service.rs`
- Create: `git-client/src-tauri/src/commands/hook.rs`
- Modify: `git-client/src-tauri/src/services/mod.rs`
- Modify: `git-client/src-tauri/src/commands/mod.rs`
- Modify: `git-client/src-tauri/src/lib.rs`

---

- [ ] **Step 1: Create hook_service.rs**

```rust
use crate::utils::error::AppError;
use git2::Repository;
use std::fs;
use std::path::PathBuf;

#[derive(Debug, serde::Serialize)]
pub struct HookInfo {
    pub name: String,
    pub exists: bool,
    pub is_executable: bool,
}

pub fn list_hooks(repo: &Repository) -> Result<Vec<HookInfo>, AppError> {
    let hooks_dir = repo.path().join("hooks");
    let hook_names = [
        "pre-commit", "prepare-commit-msg", "commit-msg", "post-commit",
        "pre-push", "pre-rebase", "post-checkout", "post-merge",
        "pre-receive", "update", "post-receive", "post-update",
    ];

    let mut hooks = Vec::new();
    for name in hook_names.iter() {
        let path = hooks_dir.join(name);
        let exists = path.exists();
        let is_executable = exists && {
            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                fs::metadata(&path)
                    .map(|m| m.permissions().mode() & 0o111 != 0)
                    .unwrap_or(false)
            }
            #[cfg(windows)]
            {
                false
            }
        };

        hooks.push(HookInfo {
            name: name.to_string(),
            exists,
            is_executable,
        });
    }
    Ok(hooks)
}

pub fn get_hook_content(repo: &Repository, hook_name: &str) -> Result<String, AppError> {
    let path = repo.path().join("hooks").join(hook_name);
    if !path.exists() {
        return Ok(String::new());
    }
    Ok(fs::read_to_string(path)?)
}

pub fn set_hook_content(repo: &Repository, hook_name: &str, content: &str) -> Result<(), AppError> {
    let path: PathBuf = repo.path().join("hooks").join(hook_name);
    fs::write(&path, content)?;

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut perms = fs::metadata(&path)?.permissions();
        perms.set_mode(0o755);
        fs::set_permissions(&path, perms)?;
    }

    Ok(())
}
```

- [ ] **Step 2: Create commands/hook.rs**

```rust
use crate::services::hook_service;
use crate::utils::error::AppError;
use crate::AppState;
use tauri::State;

#[tauri::command]
pub async fn list_hooks(
    state: State<'_, AppState>,
    repo_path: String,
) -> Result<Vec<hook_service::HookInfo>, AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        hook_service::list_hooks(&repo)
    })
    .await?
}

#[tauri::command]
pub async fn get_hook_content(
    state: State<'_, AppState>,
    repo_path: String,
    hook_name: String,
) -> Result<String, AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        hook_service::get_hook_content(&repo, &hook_name)
    })
    .await?
}

#[tauri::command]
pub async fn set_hook_content(
    state: State<'_, AppState>,
    repo_path: String,
    hook_name: String,
    content: String,
) -> Result<(), AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        hook_service::set_hook_content(&repo, &hook_name, &content)
    })
    .await?
}
```

- [ ] **Step 3: Update services/mod.rs and commands/mod.rs**

services/mod.rs:
```rust
pub mod hook_service;
```

commands/mod.rs:
```rust
pub mod hook;
```

- [ ] **Step 4: Update lib.rs `generate_handler!`**

```rust
            commands::hook::list_hooks,
            commands::hook::get_hook_content,
            commands::hook::set_hook_content,
```

- [ ] **Step 5: Verify compilation**

```bash
cd git-client/src-tauri && cargo build
```

- [ ] **Step 6: Commit**

```bash
git add git-client/src-tauri/src/services/hook_service.rs git-client/src-tauri/src/commands/hook.rs
git add git-client/src-tauri/src/services/mod.rs git-client/src-tauri/src/commands/mod.rs git-client/src-tauri/src/lib.rs
git commit -m "feat(hook): add hook management"
```
