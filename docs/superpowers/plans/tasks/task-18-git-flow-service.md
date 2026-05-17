# Task 18: Git Flow — Backend Service

> **Phase:** 3 — P2 Useful | **Dependencies:** none
> **Plan origin:** `docs/superpowers/plans/2026-05-17-git-client-features-implementation.md`

**Files:**
- Create: `git-client/src-tauri/src/services/git_flow_service.rs`
- Modify: `git-client/src-tauri/src/services/mod.rs`

---

- [ ] **Step 1: Create git_flow_service.rs**

```rust
use crate::models::branch::Branch;
use crate::utils::error::AppError;
use git2::{Repository, BranchType};

#[derive(Debug, Clone)]
pub struct GitFlowConfig {
    pub feature_prefix: String,
    pub release_prefix: String,
    pub hotfix_prefix: String,
    pub develop_branch: String,
    pub master_branch: String,
}

impl Default for GitFlowConfig {
    fn default() -> Self {
        GitFlowConfig {
            feature_prefix: "feature/".to_string(),
            release_prefix: "release/".to_string(),
            hotfix_prefix: "hotfix/".to_string(),
            develop_branch: "develop".to_string(),
            master_branch: "main".to_string(),
        }
    }
}

pub fn init_flow(repo: &Repository, config: Option<GitFlowConfig>) -> Result<(), AppError> {
    let cfg = config.unwrap_or_default();
    repo.config()?.set_str("gitflow.prefix.feature", &cfg.feature_prefix)?;
    repo.config()?.set_str("gitflow.prefix.release", &cfg.release_prefix)?;
    repo.config()?.set_str("gitflow.prefix.hotfix", &cfg.hotfix_prefix)?;
    repo.config()?.set_str("gitflow.branch.develop", &cfg.develop_branch)?;
    repo.config()?.set_str("gitflow.branch.master", &cfg.master_branch)?;
    Ok(())
}

fn get_config(repo: &Repository) -> Result<GitFlowConfig, AppError> {
    let config = repo.config()?;
    Ok(GitFlowConfig {
        feature_prefix: config.get_string("gitflow.prefix.feature")
            .unwrap_or_else(|_| "feature/".to_string()),
        release_prefix: config.get_string("gitflow.prefix.release")
            .unwrap_or_else(|_| "release/".to_string()),
        hotfix_prefix: config.get_string("gitflow.prefix.hotfix")
            .unwrap_or_else(|_| "hotfix/".to_string()),
        develop_branch: config.get_string("gitflow.branch.develop")
            .unwrap_or_else(|_| "develop".to_string()),
        master_branch: config.get_string("gitflow.branch.master")
            .unwrap_or_else(|_| "main".to_string()),
    })
}

pub fn start_feature(repo: &Repository, name: &str) -> Result<Branch, AppError> {
    let cfg = get_config(repo)?;
    let develop = repo.find_branch(&cfg.develop_branch, BranchType::Local)?;
    let commit = develop.get().peel_to_commit()?;
    let branch_name = format!("{}{}", cfg.feature_prefix, name);
    repo.branch(&branch_name, &commit, false)?;
    Ok(Branch {
        name: branch_name,
        is_remote: false,
        is_head: true,
        target_commit_id: commit.id().to_string(),
        upstream: None,
    })
}

pub fn finish_feature(repo: &Repository, name: &str) -> Result<(), AppError> {
    let cfg = get_config(repo)?;
    let feature_name = format!("{}{}", cfg.feature_prefix, name);
    let mut feature = repo.find_branch(&feature_name, BranchType::Local)?;
    let mut develop = repo.find_branch(&cfg.develop_branch, BranchType::Local)?;
    let commit = feature.get().peel_to_commit()?;
    develop.get().name().map(|n| { develop.delete().ok(); });
    repo.branch(&cfg.develop_branch, &commit, false)?;
    feature.delete()?;
    Ok(())
}

pub fn start_release(repo: &Repository, version: &str) -> Result<Branch, AppError> {
    let cfg = get_config(repo)?;
    let develop = repo.find_branch(&cfg.develop_branch, BranchType::Local)?;
    let commit = develop.get().peel_to_commit()?;
    let branch_name = format!("{}{}", cfg.release_prefix, version);
    repo.branch(&branch_name, &commit, false)?;
    Ok(Branch {
        name: branch_name,
        is_remote: false,
        is_head: true,
        target_commit_id: commit.id().to_string(),
        upstream: None,
    })
}

pub fn finish_release(repo: &Repository, version: &str) -> Result<(), AppError> {
    let cfg = get_config(repo)?;
    let release_name = format!("{}{}", cfg.release_prefix, version);
    let release = repo.find_branch(&release_name, BranchType::Local)?;
    let commit = release.get().peel_to_commit()?;
    let master = repo.find_branch(&cfg.master_branch, BranchType::Local)?;
    repo.branch(&cfg.master_branch, &commit, false)?;
    release.delete()?;
    Ok(())
}

pub fn start_hotfix(repo: &Repository, version: &str) -> Result<Branch, AppError> {
    let cfg = get_config(repo)?;
    let master = repo.find_branch(&cfg.master_branch, BranchType::Local)?;
    let commit = master.get().peel_to_commit()?;
    let branch_name = format!("{}{}", cfg.hotfix_prefix, version);
    repo.branch(&branch_name, &commit, false)?;
    Ok(Branch {
        name: branch_name,
        is_remote: false,
        is_head: true,
        target_commit_id: commit.id().to_string(),
        upstream: None,
    })
}

pub fn finish_hotfix(repo: &Repository, version: &str) -> Result<(), AppError> {
    let cfg = get_config(repo)?;
    let hotfix_name = format!("{}{}", cfg.hotfix_prefix, version);
    let hotfix = repo.find_branch(&hotfix_name, BranchType::Local)?;
    let commit = hotfix.get().peel_to_commit()?;
    let mut master = repo.find_branch(&cfg.master_branch, BranchType::Local)?;
    let mut develop = repo.find_branch(&cfg.develop_branch, BranchType::Local)?;
    repo.branch(&cfg.master_branch, &commit, false)?;
    repo.branch(&cfg.develop_branch, &commit, false)?;
    hotfix.delete()?;
    Ok(())
}
```

- [ ] **Step 2: Update services/mod.rs**

```rust
pub mod git_flow_service;
```

- [ ] **Step 3: Verify compilation**

```bash
cd git-client/src-tauri && cargo build
```

- [ ] **Step 4: Commit**

```bash
git add git-client/src-tauri/src/services/git_flow_service.rs git-client/src-tauri/src/services/mod.rs
git commit -m "feat(gitflow): add git flow service"
```
