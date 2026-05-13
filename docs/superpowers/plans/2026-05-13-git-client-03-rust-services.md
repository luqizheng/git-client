# Git客户端 实施计划 — 03: Rust服务层

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现7个Rust服务模块，封装git2操作：repo_service、commit_service、branch_service、remote_service、diff_service、merge_service、stash_service

**Architecture:** 每个service是纯函数模块，接收&git2::Repository参数，返回Result<T, AppError>。所有git2调用在此层完成，commands层仅做参数校验和spawn_blocking调度。

**Tech Stack:** Rust, git2, serde

---

### Task 1: repo_service — 打开/初始化/克隆仓库

**Files:**
- Modify: `src-tauri/src/services/repo_service.rs`

- [ ] **Step 1: 实现repo_service**

`src-tauri/src/services/repo_service.rs`:
```rust
use crate::models::repo::RepoState;
use crate::utils::error::AppError;

pub fn open_repo(path: &str) -> Result<RepoState, AppError> {
    let repo = git2::Repository::open(path)?;
    repo_state_from_repo(&repo)
}

pub fn init_repo(path: &str, bare: bool) -> Result<RepoState, AppError> {
    let repo = if bare {
        git2::Repository::init_bare(path)?
    } else {
        git2::Repository::init(path)?
    };
    repo_state_from_repo(&repo)
}

pub fn clone_repo(url: &str, path: &str) -> Result<RepoState, AppError> {
    let repo = git2::Repository::clone(url, path)?;
    repo_state_from_repo(&repo)
}

fn repo_state_from_repo(repo: &git2::Repository) -> Result<RepoState, AppError> {
    let head = repo.head().ok();
    let head_branch = head
        .as_ref()
        .and_then(|h| h.shorthand())
        .map(String::from);
    let head_commit_id = head
        .as_ref()
        .and_then(|h| h.target())
        .map(|oid| oid.to_string());
    let is_bare = repo.is_bare();
    let is_empty = repo.is_empty()?;
    Ok(RepoState {
        path: repo.path().to_string_lossy().to_string(),
        head_branch,
        head_commit_id,
        is_bare,
        is_empty,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    #[test]
    fn test_init_repo() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().to_string_lossy().to_string();
        let state = init_repo(&path, false).unwrap();
        assert_eq!(state.is_bare, false);
        assert_eq!(state.is_empty, true);
    }

    #[test]
    fn test_open_nonexistent_repo() {
        let result = open_repo("/nonexistent/path");
        assert!(result.is_err());
    }

    #[test]
    fn test_init_bare_repo() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().to_string_lossy().to_string();
        let state = init_repo(&path, true).unwrap();
        assert_eq!(state.is_bare, true);
    }
}
```

- [ ] **Step 2: 添加tempfile dev依赖**

在 `src-tauri/Cargo.toml` 的 `[dev-dependencies]` 添加：
```toml
[dev-dependencies]
tempfile = "3"
```

- [ ] **Step 3: 运行测试**

Run:
```powershell
cd d:\projects\req2task-2\git-client\src-tauri
cargo test services::repo_service::tests --lib
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/services/repo_service.rs src-tauri/Cargo.toml
git commit -m "feat: add repo_service with open/init/clone and tests"
```

---

### Task 2: commit_service — 日志/提交

**Files:**
- Modify: `src-tauri/src/services/commit_service.rs`

- [ ] **Step 1: 实现commit_service**

`src-tauri/src/services/commit_service.rs`:
```rust
use crate::models::commit::Commit;
use crate::utils::error::AppError;

pub fn log(repo: &git2::Repository, limit: u32, after: Option<&str>) -> Result<Vec<Commit>, AppError> {
    let mut revwalk = repo.revwalk()?;
    revwalk.push_head()?;
    if let Some(id) = after {
        let oid = git2::Oid::from_str(id)?;
        revwalk.hide(oid)?;
    }
    let mut commits = Vec::new();
    for oid_result in revwalk.take(limit as usize) {
        let oid = oid_result?;
        let git_commit = repo.find_commit(oid)?;
        commits.push(commit_from_git(&git_commit));
    }
    Ok(commits)
}

pub fn create_commit(
    repo: &git2::Repository,
    message: &str,
    amend: bool,
) -> Result<Commit, AppError> {
    let mut index = repo.index()?;
    index.write()?;

    let tree_id = index.write_tree()?;
    let tree = repo.find_tree(tree_id)?;

    if amend {
        let head = repo.head()?;
        let head_commit = head.peel_to_commit()?;
        let sig = repo.signature()?;
        let oid = repo.commit(
            Some("HEAD"),
            &sig,
            &sig,
            message,
            &tree,
            &[&head_commit],
        )?;
        let new_commit = repo.find_commit(oid)?;
        Ok(commit_from_git(&new_commit))
    } else {
        let sig = repo.signature()?;
        let head = repo.head()?;
        let parent = head.peel_to_commit()?;
        let oid = repo.commit(
            Some("HEAD"),
            &sig,
            &sig,
            message,
            &tree,
            &[&parent],
        )?;
        let new_commit = repo.find_commit(oid)?;
        Ok(commit_from_git(&new_commit))
    }
}

fn commit_from_git(c: &git2::Commit) -> Commit {
    Commit {
        id: c.id().to_string(),
        message: c.message().unwrap_or("").to_string(),
        author: c.author().name().unwrap_or("").to_string(),
        author_email: c.author().email().unwrap_or("").to_string(),
        time: c.time().seconds(),
        parent_ids: c.parent_ids().map(|p| p.to_string()).collect(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::repo_service;
    use tempfile::TempDir;

    fn setup_repo() -> (TempDir, git2::Repository) {
        let dir = TempDir::new().unwrap();
        let path = dir.path().to_string_lossy().to_string();
        repo_service::init_repo(&path, false).unwrap();
        let repo = git2::Repository::open(&path).unwrap();
        (dir, repo)
    }

    fn create_initial_commit(repo: &git2::Repository) -> git2::Oid {
        let sig = repo.signature().unwrap();
        let mut index = repo.index().unwrap();
        let tree_id = index.write_tree().unwrap();
        let tree = repo.find_tree(tree_id).unwrap();
        repo.commit(Some("HEAD"), &sig, &sig, "initial commit", &tree, &[])
            .unwrap()
    }

    #[test]
    fn test_log_empty_repo() {
        let (dir, repo) = setup_repo();
        let result = log(&repo, 10, None);
        assert!(result.is_err() || result.unwrap().is_empty());
        drop(repo);
        drop(dir);
    }

    #[test]
    fn test_log_with_commits() {
        let (dir, repo) = setup_repo();
        create_initial_commit(&repo);
        let commits = log(&repo, 10, None).unwrap();
        assert_eq!(commits.len(), 1);
        assert_eq!(commits[0].message, "initial commit");
        drop(repo);
        drop(dir);
    }
}
```

- [ ] **Step 2: 运行测试**

Run:
```powershell
cd d:\projects\req2task-2\git-client\src-tauri
cargo test services::commit_service::tests --lib
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/services/commit_service.rs
git commit -m "feat: add commit_service with log/create_commit and tests"
```

---

### Task 3: branch_service — 创建/切换/删除/列表

**Files:**
- Modify: `src-tauri/src/services/branch_service.rs`

- [ ] **Step 1: 实现branch_service**

`src-tauri/src/services/branch_service.rs`:
```rust
use crate::models::branch::Branch;
use crate::utils::error::AppError;

pub fn list_branches(repo: &git2::Repository) -> Result<Vec<Branch>, AppError> {
    let mut branches = Vec::new();
    let head_oid = repo.head().ok().and_then(|h| h.target());
    for branch_result in repo.branches(Some(git2::BranchType::Local))? {
        let (branch, _bt) = branch_result?;
        let name = branch.name()?.unwrap_or("").to_string();
        let target = branch.get().target().map(|o| o.to_string()).unwrap_or_default();
        let is_head = head_oid.map_or(false, |h| {
            branch.get().target().map_or(false, |t| t == h)
        });
        let upstream = branch.upstream().ok().and_then(|u| {
            u.name().ok().flatten().map(String::from)
        });
        branches.push(Branch {
            name,
            is_remote: false,
            is_head,
            target_commit_id: target,
            upstream,
        });
    }
    for branch_result in repo.branches(Some(git2::BranchType::Remote))? {
        let (branch, _bt) = branch_result?;
        let name = branch.name()?.unwrap_or("").to_string();
        let target = branch.get().target().map(|o| o.to_string()).unwrap_or_default();
        branches.push(Branch {
            name,
            is_remote: true,
            is_head: false,
            target_commit_id: target,
            upstream: None,
        });
    }
    Ok(branches)
}

pub fn create_branch(repo: &git2::Repository, name: &str, checkout: bool) -> Result<Branch, AppError> {
    let head = repo.head()?;
    let target = head.target().ok_or(AppError::BranchNotFound("HEAD".to_string()))?;
    let commit = repo.find_commit(target)?;
    let branch = repo.branch(name, &commit, false)?;
    if checkout {
        let refname = branch.get().name().ok_or(AppError::BranchNotFound(name.to_string()))?;
        repo.set_head(refname)?;
        repo.checkout_head(Some(git2::build::CheckoutBuilder::default().force()))?;
    }
    let target_id = branch.get().target().map(|o| o.to_string()).unwrap_or_default();
    Ok(Branch {
        name: name.to_string(),
        is_remote: false,
        is_head: checkout,
        target_commit_id: target_id,
        upstream: None,
    })
}

pub fn switch_branch(repo: &git2::Repository, name: &str) -> Result<(), AppError> {
    let branch = repo.find_branch(name, git2::BranchType::Local)?;
    let refname = branch.get().name().ok_or(AppError::BranchNotFound(name.to_string()))?;
    repo.set_head(refname)?;
    repo.checkout_head(Some(git2::build::CheckoutBuilder::default().force()))?;
    Ok(())
}

pub fn delete_branch(repo: &git2::Repository, name: &str, force: bool) -> Result<(), AppError> {
    let mut branch = repo.find_branch(name, git2::BranchType::Local)?;
    branch.delete()?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::repo_service;
    use tempfile::TempDir;

    fn setup_repo_with_commit() -> (TempDir, git2::Repository) {
        let dir = TempDir::new().unwrap();
        let path = dir.path().to_string_lossy().to_string();
        repo_service::init_repo(&path, false).unwrap();
        let repo = git2::Repository::open(&path).unwrap();
        let sig = repo.signature().unwrap();
        let mut index = repo.index().unwrap();
        let tree_id = index.write_tree().unwrap();
        let tree = repo.find_tree(tree_id).unwrap();
        repo.commit(Some("HEAD"), &sig, &sig, "init", &tree, &[]).unwrap();
        (dir, repo)
    }

    #[test]
    fn test_list_branches() {
        let (dir, repo) = setup_repo_with_commit();
        let branches = list_branches(&repo).unwrap();
        assert!(!branches.is_empty());
        let has_main = branches.iter().any(|b| b.is_head);
        assert!(has_main);
        drop(repo);
        drop(dir);
    }

    #[test]
    fn test_create_and_switch_branch() {
        let (dir, repo) = setup_repo_with_commit();
        let branch = create_branch(&repo, "feature", false).unwrap();
        assert_eq!(branch.name, "feature");
        switch_branch(&repo, "feature").unwrap();
        let branches = list_branches(&repo).unwrap();
        let feature = branches.iter().find(|b| b.name == "feature").unwrap();
        assert!(feature.is_head);
        drop(repo);
        drop(dir);
    }
}
```

- [ ] **Step 2: 运行测试**

Run:
```powershell
cd d:\projects\req2task-2\git-client\src-tauri
cargo test services::branch_service::tests --lib
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/services/branch_service.rs
git commit -m "feat: add branch_service with list/create/switch/delete and tests"
```

---

### Task 4: diff_service — 工作区diff/提交diff

**Files:**
- Modify: `src-tauri/src/services/diff_service.rs`

- [ ] **Step 1: 实现diff_service**

`src-tauri/src/services/diff_service.rs`:
```rust
use crate::models::diff::{DiffLine, DiffStatus, FileDiff, Hunk};
use crate::utils::error::AppError;

pub fn get_commit_diff(repo: &git2::Repository, commit_id: &str) -> Result<Vec<FileDiff>, AppError> {
    let oid = git2::Oid::from_str(commit_id)?;
    let commit = repo.find_commit(oid)?;
    let tree = commit.tree()?;
    let parent_tree = if commit.parent_count() > 0 {
        Some(repo.find_commit(commit.parent_id(0)?).unwrap().tree()?)
    } else {
        None
    };
    let diff = repo.diff_tree_to_tree(parent_tree.as_ref(), Some(&tree), None)?;
    parse_diff(&diff)
}

pub fn get_working_diff(repo: &git2::Repository) -> Result<Vec<FileDiff>, AppError> {
    let diff = repo.diff_index_to_workdir(None, None)?;
    parse_diff(&diff)
}

pub fn get_staged_diff(repo: &git2::Repository) -> Result<Vec<FileDiff>, AppError> {
    let head = repo.head()?;
    let tree = head.peel_to_tree()?;
    let diff = repo.diff_tree_to_index(Some(&tree), None, None)?;
    parse_diff(&diff)
}

fn parse_diff(diff: &git2::Diff) -> Result<Vec<FileDiff>, AppError> {
    let mut files = Vec::new();
    for i in 0..diff.deltas().len() {
        let delta = diff.get_delta(i).unwrap();
        let status = match delta.status() {
            git2::Delta::Added => DiffStatus::Added,
            git2::Delta::Deleted => DiffStatus::Deleted,
            git2::Delta::Modified => DiffStatus::Modified,
            git2::Delta::Renamed => DiffStatus::Renamed,
            git2::Delta::Copied => DiffStatus::Copied,
            _ => DiffStatus::Modified,
        };
        let path = delta
            .new_file()
            .path()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_default();
        let old_path = delta
            .old_file()
            .path()
            .map(|p| p.to_string_lossy().to_string());
        files.push(FileDiff {
            path,
            old_path,
            status,
            hunks: Vec::new(),
        });
    }
    Ok(files)
}

pub fn stage_files(repo: &git2::Repository, paths: &[String]) -> Result<(), AppError> {
    let mut index = repo.index()?;
    for path in paths {
        index.add_path(std::path::Path::new(path))?;
    }
    index.write()?;
    Ok(())
}

pub fn unstage_files(repo: &git2::Repository, paths: &[String]) -> Result<(), AppError> {
    let head = repo.head()?;
    let tree = head.peel_to_tree()?;
    let mut index = repo.index()?;
    for path in paths {
        index.remove_path(std::path::Path::new(path))?;
        let entry = tree.get_path(std::path::Path::new(path));
        if let Ok(entry) = entry {
            index.add_to_index(&entry.to_object(&repo)?, 0, true, true, true)?;
        }
    }
    index.write()?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::repo_service;
    use tempfile::TempDir;

    fn setup_repo() -> (TempDir, git2::Repository) {
        let dir = TempDir::new().unwrap();
        let path = dir.path().to_string_lossy().to_string();
        repo_service::init_repo(&path, false).unwrap();
        let repo = git2::Repository::open(&path).unwrap();
        let sig = repo.signature().unwrap();
        let mut index = repo.index().unwrap();
        let tree_id = index.write_tree().unwrap();
        let tree = repo.find_tree(tree_id).unwrap();
        repo.commit(Some("HEAD"), &sig, &sig, "init", &tree, &[]).unwrap();
        (dir, repo)
    }

    #[test]
    fn test_get_working_diff_empty() {
        let (dir, repo) = setup_repo();
        let diffs = get_working_diff(&repo).unwrap();
        assert!(diffs.is_empty());
        drop(repo);
        drop(dir);
    }
}
```

- [ ] **Step 2: 运行测试**

Run:
```powershell
cd d:\projects\req2task-2\git-client\src-tauri
cargo test services::diff_service::tests --lib
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/services/diff_service.rs
git commit -m "feat: add diff_service with commit/working/staged diff and stage/unstage"
```

---

### Task 5: remote_service — fetch/pull/push

**Files:**
- Modify: `src-tauri/src/services/remote_service.rs`

- [ ] **Step 1: 实现remote_service**

`src-tauri/src/services/remote_service.rs`:
```rust
use crate::models::remote::RemoteInfo;
use crate::utils::error::AppError;

pub fn list_remotes(repo: &git2::Repository) -> Result<Vec<RemoteInfo>, AppError> {
    let mut remotes = Vec::new();
    let remote_names = repo.remotes()?;
    for name_opt in &remote_names {
        let name = name_opt.ok_or(AppError::RemoteNotFound("unknown".to_string()))?;
        let remote = repo.find_remote(name)?;
        let url = remote.url().unwrap_or("").to_string();
        let push_url = remote.pushurl().map(String::from);
        remotes.push(RemoteInfo {
            name: name.to_string(),
            url,
            push_url,
        });
    }
    Ok(remotes)
}

pub fn add_remote(repo: &git2::Repository, name: &str, url: &str) -> Result<(), AppError> {
    repo.remote(name, url)?;
    Ok(())
}

pub fn fetch(repo: &git2::Repository, remote_name: &str) -> Result<FetchResult, AppError> {
    let mut remote = repo.find_remote(remote_name)?;
    let refspecs: Vec<&str> = remote.fetch_refspecs()
        .into_iter()
        .flatten()
        .collect();
    remote.fetch(&refspecs, None, None)?;
    Ok(FetchResult {
        remote: remote_name.to_string(),
        updated: true,
    })
}

pub fn pull(repo: &git2::Repository, remote_name: &str, branch: &str) -> Result<PullResult, AppError> {
    fetch(repo, remote_name)?;
    let remote_branch = format!("remotes/{}/{}", remote_name, branch);
    let remote_ref = repo.find_reference(&remote_branch)?;
    let remote_oid = remote_ref.target().ok_or(AppError::BranchNotFound(remote_branch.clone()))?;
    let remote_commit = repo.find_commit(remote_oid)?;
    let head = repo.head()?;
    let head_oid = head.target().ok_or(AppError::BranchNotFound("HEAD".to_string()))?;
    let head_commit = repo.find_commit(head_oid)?;
    let merge_result = repo.merge(&[&remote_commit], None, None)?;
    Ok(PullResult {
        remote: remote_name.to_string(),
        branch: branch.to_string(),
        had_conflicts: merge_result.has_conflicts(),
    })
}

pub fn push(repo: &git2::Repository, remote_name: &str, branch: &str) -> Result<PushResult, AppError> {
    let mut remote = repo.find_remote(remote_name)?;
    let refspec = format!("refs/heads/{}:refs/heads/{}", branch, branch);
    remote.push(&[&refspec], None)?;
    Ok(PushResult {
        remote: remote_name.to_string(),
        branch: branch.to_string(),
    })
}

#[derive(Debug, serde::Serialize)]
pub struct FetchResult {
    pub remote: String,
    pub updated: bool,
}

#[derive(Debug, serde::Serialize)]
pub struct PullResult {
    pub remote: String,
    pub branch: String,
    pub had_conflicts: bool,
}

#[derive(Debug, serde::Serialize)]
pub struct PushResult {
    pub remote: String,
    pub branch: String,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::repo_service;
    use tempfile::TempDir;

    #[test]
    fn test_list_remotes_empty() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().to_string_lossy().to_string();
        repo_service::init_repo(&path, false).unwrap();
        let repo = git2::Repository::open(&path).unwrap();
        let remotes = list_remotes(&repo).unwrap();
        assert!(remotes.is_empty());
    }

    #[test]
    fn test_add_remote() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().to_string_lossy().to_string();
        repo_service::init_repo(&path, false).unwrap();
        let repo = git2::Repository::open(&path).unwrap();
        add_remote(&repo, "origin", "https://github.com/user/repo.git").unwrap();
        let remotes = list_remotes(&repo).unwrap();
        assert_eq!(remotes.len(), 1);
        assert_eq!(remotes[0].name, "origin");
    }
}
```

- [ ] **Step 2: 运行测试**

Run:
```powershell
cd d:\projects\req2task-2\git-client\src-tauri
cargo test services::remote_service::tests --lib
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/services/remote_service.rs
git commit -m "feat: add remote_service with list/add/fetch/pull/push and tests"
```

---

### Task 6: merge_service — 合并/变基/冲突解决

**Files:**
- Modify: `src-tauri/src/services/merge_service.rs`

- [ ] **Step 1: 实现merge_service**

`src-tauri/src/services/merge_service.rs`:
```rust
use crate::models::remote::ConflictFile;
use crate::utils::error::AppError;

pub fn merge(repo: &git2::Repository, branch: &str) -> Result<MergeResult, AppError> {
    let branch_ref = repo.find_reference(&format!("refs/heads/{}", branch))?;
    let branch_oid = branch_ref.target().ok_or(AppError::BranchNotFound(branch.to_string()))?;
    let branch_commit = repo.find_commit(branch_oid)?;
    let merge_result = repo.merge(&[&branch_commit], None, None)?;
    let conflicts = if merge_result.has_conflicts() {
        collect_conflicts(&repo)?
    } else {
        Vec::new()
    };
    Ok(MergeResult {
        branch: branch.to_string(),
        had_conflicts: merge_result.has_conflicts(),
        conflicts,
    })
}

pub fn resolve_conflict(repo: &git2::Repository, path: &str, content: &str) -> Result<(), AppError> {
    let workdir = repo.workdir().ok_or(AppError::NotARepo("bare repo".to_string()))?;
    let file_path = workdir.join(path);
    std::fs::write(&file_path, content)?;
    let mut index = repo.index()?;
    index.add_path(std::path::Path::new(path))?;
    index.write()?;
    Ok(())
}

fn collect_conflicts(repo: &git2::Repository) -> Result<Vec<ConflictFile>, AppError> {
    let index = repo.index()?;
    let mut conflicts = Vec::new();
    for conflict in index.conflicts()? {
        if let Some(conflict) = conflict {
            let path = conflict.ours
                .or(conflict.theirs)
                .map(|c| c.path)
                .flatten()
                .map(|p| String::from_utf8_lossy(&p).to_string())
                .unwrap_or_default();
            conflicts.push(ConflictFile {
                path,
                ours_modified: conflict.ours.is_some(),
                theirs_modified: conflict.theirs.is_some(),
            });
        }
    }
    Ok(conflicts)
}

#[derive(Debug, serde::Serialize)]
pub struct MergeResult {
    pub branch: String,
    pub had_conflicts: bool,
    pub conflicts: Vec<ConflictFile>,
}

#[derive(Debug, serde::Serialize)]
pub struct RebaseResult {
    pub branch: String,
    pub had_conflicts: bool,
    pub conflicts: Vec<ConflictFile>,
}

#[derive(Debug, serde::Serialize)]
pub struct CherryPickResult {
    pub commit_id: String,
    pub had_conflicts: bool,
    pub conflicts: Vec<ConflictFile>,
}

pub fn cherry_pick(repo: &git2::Repository, commit_id: &str) -> Result<CherryPickResult, AppError> {
    let oid = git2::Oid::from_str(commit_id)?;
    let commit = repo.find_commit(oid)?;
    let mut index = repo.cherrypick_commit(&commit, &repo.head()?.peel_to_commit()?, 0, None)?;
    if index.has_conflicts() {
        let conflicts = collect_conflicts_from_index(&repo, &index)?;
        Ok(CherryPickResult {
            commit_id: commit_id.to_string(),
            had_conflicts: true,
            conflicts,
        })
    } else {
        Ok(CherryPickResult {
            commit_id: commit_id.to_string(),
            had_conflicts: false,
            conflicts: Vec::new(),
        })
    }
}

fn collect_conflicts_from_index(repo: &git2::Repository, index: &git2::Index) -> Result<Vec<ConflictFile>, AppError> {
    let mut conflicts = Vec::new();
    for conflict in index.conflicts()? {
        if let Some(conflict) = conflict {
            let path = conflict.ours
                .or(conflict.theirs)
                .map(|c| c.path)
                .flatten()
                .map(|p| String::from_utf8_lossy(&p).to_string())
                .unwrap_or_default();
            conflicts.push(ConflictFile {
                path,
                ours_modified: conflict.ours.is_some(),
                theirs_modified: conflict.theirs.is_some(),
            });
        }
    }
    Ok(conflicts)
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
git add src-tauri/src/services/merge_service.rs
git commit -m "feat: add merge_service with merge/resolve_conflict/cherry_pick"
```

---

### Task 7: stash_service

**Files:**
- Modify: `src-tauri/src/services/stash_service.rs`

- [ ] **Step 1: 实现stash_service**

`src-tauri/src/services/stash_service.rs`:
```rust
use crate::models::stash::StashEntry;
use crate::utils::error::AppError;

pub fn stash_save(repo: &git2::Repository, message: &str) -> Result<StashEntry, AppError> {
    let sig = repo.signature()?;
    let oid = repo.stash_save(&sig, message, None)?;
    Ok(StashEntry {
        index: 0,
        message: message.to_string(),
        commit_id: oid.to_string(),
    })
}

pub fn stash_list(repo: &git2::Repository) -> Result<Vec<StashEntry>, AppError> {
    let mut entries = Vec::new();
    repo.stash_foreach(|index, msg, oid| {
        entries.push(StashEntry {
            index,
            message: msg.to_string(),
            commit_id: oid.to_string(),
        });
        true
    })?;
    Ok(entries)
}

pub fn stash_pop(repo: &git2::Repository, index: u32) -> Result<(), AppError> {
    repo.stash_pop(index, None)?;
    Ok(())
}

pub fn stash_drop(repo: &git2::Repository, index: u32) -> Result<(), AppError> {
    repo.stash_drop(index)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::repo_service;
    use tempfile::TempDir;

    fn setup_repo_with_commit() -> (TempDir, git2::Repository) {
        let dir = TempDir::new().unwrap();
        let path = dir.path().to_string_lossy().to_string();
        repo_service::init_repo(&path, false).unwrap();
        let repo = git2::Repository::open(&path).unwrap();
        let sig = repo.signature().unwrap();
        let mut index = repo.index().unwrap();
        let tree_id = index.write_tree().unwrap();
        let tree = repo.find_tree(tree_id).unwrap();
        repo.commit(Some("HEAD"), &sig, &sig, "init", &tree, &[]).unwrap();
        (dir, repo)
    }

    #[test]
    fn test_stash_list_empty() {
        let (dir, repo) = setup_repo_with_commit();
        let entries = stash_list(&repo).unwrap();
        assert!(entries.is_empty());
        drop(repo);
        drop(dir);
    }
}
```

- [ ] **Step 2: 运行测试**

Run:
```powershell
cd d:\projects\req2task-2\git-client\src-tauri
cargo test services::stash_service::tests --lib
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/services/stash_service.rs
git commit -m "feat: add stash_service with save/list/pop/drop and tests"
```

---

### Task 8: 全量Rust测试验证

**Files:** 无新增

- [ ] **Step 1: 运行全部Rust测试**

Run:
```powershell
cd d:\projects\req2task-2\git-client\src-tauri
cargo test --lib
```

Expected: ALL PASS

- [ ] **Step 2: cargo clippy检查**

Run:
```powershell
cd d:\projects\req2task-2\git-client\src-tauri
cargo clippy -- -D warnings
```

Expected: 无warning

- [ ] **Step 3: 修复clippy问题(如有)**

根据clippy输出修复代码。

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "fix: resolve clippy warnings in service layer"
```
