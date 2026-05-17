# Task 25: Config Management — Backend Extension

> **Phase:** 4 — P3 Enhancement | **Dependencies:** none (existing settings)
> **Plan origin:** `docs/superpowers/plans/2026-05-17-git-client-features-implementation.md`

**Files:**
- Modify: `git-client/src-tauri/src/commands/settings.rs`
- Modify: `git-client/src-tauri/src/lib.rs`

---

- [ ] **Step 1: Update settings.rs to add git config management**

Add these structs and commands:

```rust
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct GitConfig {
    pub user_name: Option<String>,
    pub user_email: Option<String>,
}

#[tauri::command]
pub async fn get_git_config(repo_path: Option<String>) -> Result<GitConfig, AppError> {
    tokio::task::spawn_blocking(move || {
        let config = if let Some(path) = repo_path {
            let repo = git2::Repository::open(&path)?;
            repo.config()?
        } else {
            git2::Config::open_default()?
        };

        Ok(GitConfig {
            user_name: config.get_string("user.name").ok(),
            user_email: config.get_string("user.email").ok(),
        })
    })
    .await?
}

#[tauri::command]
pub async fn set_git_config(
    repo_path: Option<String>,
    config: GitConfig,
) -> Result<(), AppError> {
    tokio::task::spawn_blocking(move || {
        let mut git_config = if let Some(path) = repo_path {
            let repo = git2::Repository::open(&path)?;
            repo.config()?
        } else {
            git2::Config::open_default()?
        };

        if let Some(ref name) = config.user_name {
            git_config.set_str("user.name", name)?;
        }
        if let Some(ref email) = config.user_email {
            git_config.set_str("user.email", email)?;
        }

        Ok(())
    })
    .await?
}
```

- [ ] **Step 2: Update lib.rs `generate_handler!`**

```rust
            commands::settings::get_git_config,
            commands::settings::set_git_config,
```

- [ ] **Step 3: Verify compilation**

```bash
cd git-client/src-tauri && cargo build
```

- [ ] **Step 4: Commit**

```bash
git add git-client/src-tauri/src/commands/settings.rs git-client/src-tauri/src/lib.rs
git commit -m "feat(settings): add git config management"
```
