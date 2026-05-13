# Multi-Repo Tabs + Commit List with Search — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 支持多仓库 Tab 切换 + commit 列表 + 全字段搜索

**Architecture:** 前端 Pinia 缓存多仓库状态，Tab 切换即时渲染；搜索走后端 git2 revwalk + 过滤。后端新增 `search_commits` 和 `close_repo` 命令，Commit 模型增加 `refs` 字段。

**Tech Stack:** Rust/git2 (后端) + Vue 3/Pinia/Naive UI/UnoCSS (前端) + Tauri 2 IPC

---

## File Structure

### Backend (Rust) — 所有路径相对于 `git-client/src-tauri/`

| Action | Path | Responsibility |
|---|---|---|
| Modify | `src/models/commit.rs` | Commit 增加 refs 字段 |
| Modify | `src/services/commit_service.rs` | log 返回 refs；新增 search 函数 |
| Modify | `src/commands/commit.rs` | 新增 search_commits 命令 |
| Modify | `src/commands/repo.rs` | 新增 close_repo；init/clone 注册 RepoManager |
| Modify | `src/lib.rs` | 注册新命令到 invoke_handler |
| Modify | `src/utils/error.rs` | 新增 SearchError 变体 |

### Frontend (Vue) — 所有路径相对于 `git-client/src/`

| Action | Path | Responsibility |
|---|---|---|
| Modify | `types/git.d.ts` | Commit 增加 refs |
| Modify | `stores/repo.ts` | 多仓库 Map + activeRepoPath + search state |
| Modify | `stores/commits.ts` | 数据移入 OpenRepo，方法加 repoPath 参数 |
| Modify | `stores/branches.ts` | 数据移入 OpenRepo，方法加 repoPath 参数 |
| Modify | `stores/staging.ts` | fileStates Map 化 |
| Modify | `stores/diff.ts` | diffStates Map 化 |
| Modify | `stores/remote.ts` | remoteStates Map 化 |
| Modify | `stores/app.ts` | recentRepos 移入 repo store |
| Modify | `utils/ipc.ts` | 新增 search_commits/close_repo mock |
| Create | `components/layout/RepoTabs.vue` | Tab 栏组件 |
| Create | `components/commit/CommitList.vue` | 左侧 commit 列表 + 搜索 |
| Create | `components/commit/CommitDetailPanel.vue` | 右侧 commit 详情 |
| Modify | `components/layout/AppLayout.vue` | 插入 RepoTabs，主内容区分栏 |
| Modify | `components/layout/Toolbar.vue` | 打开仓库逻辑适配多仓库 |
| Modify | `components/layout/StatusBar.vue` | activeRepo 适配 |
| Modify | `components/commit/CommitPanel.vue` | 移除（功能拆分到 CommitDetailPanel + StageArea） |
| Modify | `components/commit/StageArea.vue` | repoPath → activeRepoPath |
| Modify | `components/commit/CommitEditor.vue` | repoPath → activeRepoPath |
| Modify | `components/branch/BranchTree.vue` | repoPath → activeRepoPath |
| Modify | `components/remote/RemotePanel.vue` | repoPath → activeRepoPath |
| Modify | `components/diff/DiffView.vue` | 适配 diffStates Map |
| Modify | `composables/useWorkdirWatcher.ts` | repoPath → activeRepoPath + 事件携带 repoPath |
| Modify | `App.vue` | 移除 GraphView/CommitPanel，用新布局替换 |
| Delete | `components/graph/GraphView.vue` | 功能合并到 CommitList |
| Delete | `components/graph/CommitCanvas.vue` | 功能合并到 CommitList |
| Delete | `components/graph/CommitDetail.vue` | 功能合并到 CommitDetailPanel |

---

## Task 1: Backend — Commit 模型增加 refs 字段

**Files:**
- Modify: `git-client/src-tauri/src/models/commit.rs`
- Modify: `git-client/src-tauri/src/services/commit_service.rs`

- [ ] **Step 1: 修改 Commit 模型，增加 refs 字段**

`git-client/src-tauri/src/models/commit.rs` — 在 Commit struct 中增加 `refs` 字段：

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
    pub refs: Vec<String>,
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
            refs: vec!["main".to_string(), "v1.0".to_string()],
        };
        let json = serde_json::to_string(&commit).unwrap();
        let parsed: Commit = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed, commit);
    }

    #[test]
    fn test_commit_refs_default_empty() {
        let commit = Commit {
            id: "def456".to_string(),
            message: "second".to_string(),
            author: "user".to_string(),
            author_email: "user@example.com".to_string(),
            time: 1700000100,
            parent_ids: vec![],
            refs: vec![],
        };
        let json = serde_json::to_string(&commit).unwrap();
        let parsed: Commit = serde_json::from_str(&json).unwrap();
        assert!(parsed.refs.is_empty());
    }
}
```

- [ ] **Step 2: 修改 commit_service::log，填充 refs**

`git-client/src-tauri/src/services/commit_service.rs` — 新增 `collect_refs` 函数，修改 `commit_from_git`：

```rust
use crate::models::commit::Commit;
use crate::utils::error::AppError;
use std::collections::HashMap;

pub fn log(repo: &git2::Repository, limit: u32, after: Option<&str>) -> Result<Vec<Commit>, AppError> {
    let mut revwalk = repo.revwalk()?;
    revwalk.push_head()?;
    if let Some(id) = after {
        let oid = git2::Oid::from_str(id)?;
        revwalk.hide(oid)?;
    }
    let ref_map = build_ref_map(repo)?;
    let mut commits = Vec::new();
    for oid_result in revwalk.take(limit as usize) {
        let oid = oid_result?;
        let git_commit = repo.find_commit(oid)?;
        let id_str = oid.to_string();
        let refs = ref_map.get(&id_str).cloned().unwrap_or_default();
        commits.push(commit_from_git(&git_commit, refs));
    }
    Ok(commits)
}

pub fn create_commit(
    repo: &mut git2::Repository,
    message: &str,
    amend: bool,
) -> Result<Commit, AppError> {
    let mut index = repo.index()?;
    index.write()?;

    let tree_id = index.write_tree()?;
    let tree = repo.find_tree(tree_id)?;
    let sig = repo.signature()?;

    let parents: Vec<git2::Commit> = if amend {
        let head = repo.head()?;
        vec![head.peel_to_commit()?]
    } else if repo.is_empty()? {
        vec![]
    } else {
        let head = repo.head()?;
        vec![head.peel_to_commit()?]
    };

    let parent_refs: Vec<&git2::Commit> = parents.iter().collect();
    let oid = repo.commit(Some("HEAD"), &sig, &sig, message, &tree, &parent_refs)?;
    let new_commit = repo.find_commit(oid)?;
    let id_str = oid.to_string();
    let ref_map = build_ref_map(repo)?;
    let refs = ref_map.get(&id_str).cloned().unwrap_or_default();
    Ok(commit_from_git(&new_commit, refs))
}

fn build_ref_map(repo: &git2::Repository) -> Result<HashMap<String, Vec<String>>, AppError> {
    let mut map: HashMap<String, Vec<String>> = HashMap::new();
    for reference in repo.references()? {
        let reference = reference?;
        let name = reference.shorthand().unwrap_or("").to_string();
        if name.is_empty() {
            continue;
        }
        if let Some(target) = reference.target() {
            let id_str = target.to_string();
            map.entry(id_str).or_default().push(name);
        }
    }
    Ok(map)
}

fn commit_from_git(c: &git2::Commit, refs: Vec<String>) -> Commit {
    Commit {
        id: c.id().to_string(),
        message: c.message().unwrap_or("").to_string(),
        author: c.author().name().unwrap_or("").to_string(),
        author_email: c.author().email().unwrap_or("").to_string(),
        time: c.time().seconds(),
        parent_ids: c.parent_ids().map(|p| p.to_string()).collect(),
        refs,
    }
}
```

- [ ] **Step 3: 运行 Rust 测试验证**

Run: `cd git-client/src-tauri && cargo test`
Expected: 所有测试通过

- [ ] **Step 4: Commit**

```bash
git add git-client/src-tauri/src/models/commit.rs git-client/src-tauri/src/services/commit_service.rs
git commit -m "feat: add refs field to Commit model and populate in log"
```

---

## Task 2: Backend — 新增 search_commits 和 close_repo 命令

**Files:**
- Modify: `git-client/src-tauri/src/utils/error.rs`
- Modify: `git-client/src-tauri/src/services/commit_service.rs`
- Modify: `git-client/src-tauri/src/commands/commit.rs`
- Modify: `git-client/src-tauri/src/commands/repo.rs`
- Modify: `git-client/src-tauri/src/lib.rs`

- [ ] **Step 1: 新增 SearchError 变体**

`git-client/src-tauri/src/utils/error.rs` — 在 AppError 枚举中添加：

```rust
#[error("Search error: {0}")]
Search(String),
```

位置在 `RemoteNotFound` 之后。

- [ ] **Step 2: 新增 SearchFilter 模型**

`git-client/src-tauri/src/models/commit.rs` — 在文件末尾（tests 模块之前）添加：

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SearchFilter {
    All,
    Message,
    Author,
    Hash,
    File,
}
```

- [ ] **Step 3: 实现 commit_service::search**

`git-client/src-tauri/src/services/commit_service.rs` — 新增 search 函数：

```rust
use crate::models::commit::SearchFilter;

pub fn search(
    repo: &git2::Repository,
    query: &str,
    filter: &SearchFilter,
    limit: u32,
) -> Result<Vec<Commit>, AppError> {
    let query_lower = query.to_lowercase();
    let mut revwalk = repo.revwalk()?;
    revwalk.push_head()?;
    let ref_map = build_ref_map(repo)?;
    let mut results = Vec::new();

    for oid_result in revwalk {
        if results.len() >= limit as usize {
            break;
        }
        let oid = oid_result?;
        let git_commit = repo.find_commit(oid)?;
        let id_str = oid.to_string();
        let matched = match filter {
            SearchFilter::Hash => id_str.starts_with(query),
            SearchFilter::Message => git_commit
                .message()
                .unwrap_or("")
                .to_lowercase()
                .contains(&query_lower),
            SearchFilter::Author => {
                let author = git_commit.author();
                let name_match = author
                    .name()
                    .unwrap_or("")
                    .to_lowercase()
                    .contains(&query_lower);
                let email_match = author
                    .email()
                    .unwrap_or("")
                    .to_lowercase()
                    .contains(&query_lower);
                name_match || email_match
            }
            SearchFilter::File => {
                let tree = git_commit.tree().ok();
                tree.map_or(false, |t| tree_contains_path(&t, &query_lower))
            }
            SearchFilter::All => {
                id_str.starts_with(query)
                    || git_commit
                        .message()
                        .unwrap_or("")
                        .to_lowercase()
                        .contains(&query_lower)
                    || {
                        let author = git_commit.author();
                        author.name().unwrap_or("").to_lowercase().contains(&query_lower)
                            || author.email().unwrap_or("").to_lowercase().contains(&query_lower)
                    }
                    || git_commit
                        .tree()
                        .ok()
                        .map_or(false, |t| tree_contains_path(&t, &query_lower))
            }
        };

        if matched {
            let refs = ref_map.get(&id_str).cloned().unwrap_or_default();
            results.push(commit_from_git(&git_commit, refs));
        }
    }
    Ok(results)
}

fn tree_contains_path(tree: &git2::Tree, query_lower: &str) -> bool {
    for entry in tree.iter() {
        let name = entry.name().unwrap_or("").to_lowercase();
        if name.contains(query_lower) {
            return true;
        }
        if let Some(subtree) = entry.to_object(tree.repo()).ok() {
            if let Some(sub_tree) = subtree.as_tree() {
                if tree_contains_path(sub_tree, query_lower) {
                    return true;
                }
            }
        }
    }
    false
}
```

注意：`tree_contains_path` 中 `tree.repo()` 不存在，需通过传入 repo 参数。修正：

```rust
fn tree_contains_path(repo: &git2::Repository, tree: &git2::Tree, query_lower: &str) -> bool {
    for entry in tree.iter() {
        let name = entry.name().unwrap_or("").to_lowercase();
        if name.contains(query_lower) {
            return true;
        }
        if let Ok(obj) = entry.to_object(repo) {
            if let Some(sub_tree) = obj.as_tree() {
                if tree_contains_path(repo, sub_tree, query_lower) {
                    return true;
                }
            }
        }
    }
    false
}
```

同步修改 search 函数中的调用：`tree.map_or(false, |t| tree_contains_path(repo, &t, &query_lower))`

- [ ] **Step 4: 新增 search_commits 命令**

`git-client/src-tauri/src/commands/commit.rs` — 添加：

```rust
use crate::models::commit::SearchFilter;

#[tauri::command]
pub async fn search_commits(
    state: State<'_, AppState>,
    repo_path: String,
    query: String,
    filter: SearchFilter,
    limit: Option<u32>,
) -> Result<Vec<Commit>, AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        commit_service::search(&repo, &query, &filter, limit.unwrap_or(50))
    })
    .await?
}
```

- [ ] **Step 5: 新增 close_repo 命令**

`git-client/src-tauri/src/commands/repo.rs` — 添加：

```rust
#[tauri::command]
pub async fn close_repo(
    state: State<'_, AppState>,
    path: String,
) -> Result<(), AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let mut manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        manager.close(&path);
        Ok(())
    })
    .await?
}
```

- [ ] **Step 6: 修复 init_repo 和 clone_repo 注册到 RepoManager**

`git-client/src-tauri/src/commands/repo.rs` — 修改 `init_repo` 和 `clone_repo`：

```rust
#[tauri::command]
pub async fn init_repo(
    state: State<'_, AppState>,
    path: String,
    bare: bool,
) -> Result<RepoState, AppError> {
    let repos = state.repos.clone();
    let path_clone = path.clone();
    tokio::task::spawn_blocking(move || {
        let repo_state = repo_service::init_repo(&path_clone, bare)?;
        let mut manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        manager.open(&path_clone)?;
        Ok(repo_state)
    })
    .await?
}

#[tauri::command]
pub async fn clone_repo(
    state: State<'_, AppState>,
    url: String,
    path: String,
) -> Result<RepoState, AppError> {
    let repos = state.repos.clone();
    let path_clone = path.clone();
    tokio::task::spawn_blocking(move || {
        let repo_state = repo_service::clone_repo(&url, &path_clone)?;
        let mut manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        manager.open(&path_clone)?;
        Ok(repo_state)
    })
    .await?
}
```

- [ ] **Step 7: 注册新命令**

`git-client/src-tauri/src/lib.rs` — 在 `invoke_handler` 宏中添加：

```rust
commands::commit::search_commits,
commands::repo::close_repo,
```

位置在 `commands::commit::commit` 之后和 `commands::branch::list_branches` 之前。

- [ ] **Step 8: 运行 cargo build 验证编译**

Run: `cd git-client/src-tauri && cargo build`
Expected: 编译成功

- [ ] **Step 9: 运行测试**

Run: `cd git-client/src-tauri && cargo test`
Expected: 所有测试通过

- [ ] **Step 10: Commit**

```bash
git add git-client/src-tauri/src/
git commit -m "feat: add search_commits and close_repo commands"
```

---

## Task 3: Frontend — 类型定义 + ipc mock 更新

**Files:**
- Modify: `git-client/src/types/git.d.ts`
- Modify: `git-client/src/utils/ipc.ts`

- [ ] **Step 1: 更新 Commit 类型，增加 refs**

`git-client/src/types/git.d.ts` — 修改 Commit interface：

```typescript
export interface Commit {
  id: string
  message: string
  author: string
  author_email: string
  time: number
  parent_ids: string[]
  refs: string[]
}

export type SearchFilter = 'all' | 'message' | 'author' | 'hash' | 'file'

export interface OpenRepo {
  state: RepoState
  commits: Commit[]
  branches: Branch[]
  selectedCommit: Commit | null
  hasMore: boolean
  loading: boolean
}
```

- [ ] **Step 2: 更新 ipc.ts mock 数据**

`git-client/src/utils/ipc.ts` — 在 `mockData` 中添加：

```typescript
const mockData: Record<string, unknown> = {
  open_repo: { path: '/mock/repo', head_branch: 'main', head_commit_id: 'abc123', is_bare: false, is_empty: false },
  get_log: [],
  search_commits: [],
  close_repo: null,
  list_branches: [{ name: 'main', is_remote: false, is_head: true, target_commit_id: 'abc123', upstream: null }],
  list_remotes: [{ name: 'origin', url: 'https://github.com/user/repo.git', push_url: null }],
  load_settings: { theme: 'dark', sidebarWidth: 250, sidebarCollapsed: false, language: 'en' },
}
```

- [ ] **Step 3: Commit**

```bash
git add git-client/src/types/git.d.ts git-client/src/utils/ipc.ts
git commit -m "feat: add refs to Commit type and search mock data"
```

---

## Task 4: Frontend — repo store 多仓库改造

**Files:**
- Modify: `git-client/src/stores/repo.ts`
- Modify: `git-client/src/stores/app.ts`

- [ ] **Step 1: 重写 repo store 为多仓库模式**

`git-client/src/stores/repo.ts`：

```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { RepoState, Commit, OpenRepo, SearchFilter } from '../types/git'
import { invoke } from '../utils/ipc'

export const useRepoStore = defineStore('repo', () => {
  const openRepos = ref<Map<string, OpenRepo>>(new Map())
  const activeRepoPath = ref<string | null>(null)
  const recentRepos = ref<string[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const searchQuery = ref('')
  const searchFilter = ref<SearchFilter>('all')
  const searchResults = ref<Commit[]>([])
  const searchLoading = ref(false)

  const activeRepo = computed(() => {
    if (!activeRepoPath.value) return null
    return openRepos.value.get(activeRepoPath.value) ?? null
  })

  function repoName(path: string): string {
    const parts = path.replace(/\\/g, '/').split('/')
    return parts[parts.length - 1] || path
  }

  async function openRepo(path: string) {
    loading.value = true
    error.value = null
    try {
      const state = await invoke<RepoState>('open_repo', { path })
      openRepos.value.set(path, {
        state,
        commits: [],
        branches: [],
        selectedCommit: null,
        hasMore: true,
        loading: false,
      })
      activeRepoPath.value = path
      if (!recentRepos.value.includes(path)) {
        recentRepos.value.unshift(path)
        if (recentRepos.value.length > 10) {
          recentRepos.value = recentRepos.value.slice(0, 10)
        }
      }
    } catch (e) {
      error.value = String(e)
    } finally {
      loading.value = false
    }
  }

  async function closeRepo(path: string) {
    try {
      await invoke('close_repo', { path })
    } catch (e) {
      console.warn('close_repo error:', e)
    }
    openRepos.value.delete(path)
    if (activeRepoPath.value === path) {
      const keys = Array.from(openRepos.value.keys())
      activeRepoPath.value = keys.length > 0 ? keys[keys.length - 1] : null
    }
    const idx = recentRepos.value.indexOf(path)
    if (idx !== -1) recentRepos.value.splice(idx, 1)
  }

  function switchTab(path: string) {
    if (openRepos.value.has(path)) {
      activeRepoPath.value = path
    }
  }

  async function searchCommits() {
    if (!activeRepoPath.value || !searchQuery.value.trim()) return
    searchLoading.value = true
    try {
      searchResults.value = await invoke<Commit[]>('search_commits', {
        repoPath: activeRepoPath.value,
        query: searchQuery.value,
        filter: searchFilter.value,
        limit: 50,
      })
    } catch (e) {
      console.error('search error:', e)
    } finally {
      searchLoading.value = false
    }
  }

  function clearSearch() {
    searchQuery.value = ''
    searchResults.value = []
    searchFilter.value = 'all'
  }

  return {
    openRepos, activeRepoPath, recentRepos, loading, error,
    searchQuery, searchFilter, searchResults, searchLoading,
    activeRepo, repoName,
    openRepo, closeRepo, switchTab, searchCommits, clearSearch,
  }
})
```

- [ ] **Step 2: 更新 app store 移除 recentRepos**

`git-client/src/stores/app.ts` — 移除 `recentRepos` ref，改为从 repo store 获取。修改 `loadSettings` 和 `saveSettings` 中的 `recent_repos` 引用：

```typescript
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { invoke } from '../utils/ipc'

interface AppSettings {
  theme: string
  locale: string
  recent_repos: string[]
  sidebar_width: number
  sidebar_collapsed: boolean
}

export const useAppStore = defineStore('app', () => {
  const theme = ref<'dark' | 'light'>('dark')
  const locale = ref<'zh' | 'en'>('zh')
  const sidebarWidth = ref(240)
  const sidebarCollapsed = ref(false)

  function setTheme(t: 'dark' | 'light') {
    theme.value = t
    document.documentElement.setAttribute('data-theme', t)
    saveSettings()
  }

  function setLocale(l: 'zh' | 'en') {
    locale.value = l
    saveSettings()
  }

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
    saveSettings()
  }

  async function loadSettings() {
    try {
      const settings = await invoke<AppSettings>('load_settings')
      theme.value = settings.theme as 'dark' | 'light'
      locale.value = settings.locale as 'zh' | 'en'
      sidebarWidth.value = settings.sidebar_width
      sidebarCollapsed.value = settings.sidebar_collapsed
      document.documentElement.setAttribute('data-theme', theme.value)
    } catch (e) {
      console.error('loadSettings error:', e)
    }
  }

  async function saveSettings() {
    try {
      const { useRepoStore } = await import('./repo')
      const repo = useRepoStore()
      await invoke('save_settings', {
        settings: {
          theme: theme.value,
          locale: locale.value,
          recent_repos: repo.recentRepos,
          sidebar_width: sidebarWidth.value,
          sidebar_collapsed: sidebarCollapsed.value,
        },
      })
    } catch (e) {
      console.error('saveSettings error:', e)
    }
  }

  return { theme, locale, sidebarWidth, sidebarCollapsed, setTheme, setLocale, toggleSidebar, loadSettings, saveSettings }
})
```

- [ ] **Step 3: Commit**

```bash
git add git-client/src/stores/repo.ts git-client/src/stores/app.ts
git commit -m "feat: refactor repo store for multi-repo support"
```

---

## Task 5: Frontend — commits/branches store 多仓库适配

**Files:**
- Modify: `git-client/src/stores/commits.ts`
- Modify: `git-client/src/stores/branches.ts`

- [ ] **Step 1: 重写 commits store**

`git-client/src/stores/commits.ts` — 数据操作委托给 repo store 中的 OpenRepo：

```typescript
import { defineStore } from 'pinia'
import type { Commit } from '../types/git'
import { invoke } from '../utils/ipc'
import { useRepoStore } from './repo'

export const useCommitsStore = defineStore('commits', () => {
  async function fetchLogs(repoPath: string, limit = 50, after?: string) {
    const repo = useRepoStore()
    const openRepo = repo.openRepos.get(repoPath)
    if (!openRepo) return
    openRepo.loading = true
    try {
      const result = await invoke<Commit[]>('get_log', { repoPath, limit, after })
      if (after) {
        openRepo.commits.push(...result)
      } else {
        openRepo.commits = result
      }
      openRepo.hasMore = result.length >= limit
    } catch (e) {
      console.error('fetchLogs error:', e)
    } finally {
      openRepo.loading = false
    }
  }

  function selectCommit(repoPath: string, commit: Commit | null) {
    const repo = useRepoStore()
    const openRepo = repo.openRepos.get(repoPath)
    if (openRepo) {
      openRepo.selectedCommit = commit
    }
  }

  function clearCommits(repoPath: string) {
    const repo = useRepoStore()
    const openRepo = repo.openRepos.get(repoPath)
    if (openRepo) {
      openRepo.commits = []
      openRepo.selectedCommit = null
      openRepo.hasMore = true
    }
  }

  return { fetchLogs, selectCommit, clearCommits }
})
```

- [ ] **Step 2: 重写 branches store**

`git-client/src/stores/branches.ts`：

```typescript
import { defineStore } from 'pinia'
import type { Branch } from '../types/git'
import { invoke } from '../utils/ipc'
import { useRepoStore } from './repo'

export const useBranchesStore = defineStore('branches', () => {
  async function fetchBranches(repoPath: string) {
    const repo = useRepoStore()
    const openRepo = repo.openRepos.get(repoPath)
    if (!openRepo) return
    try {
      openRepo.branches = await invoke<Branch[]>('list_branches', { repoPath })
    } catch (e) {
      console.error('fetchBranches error:', e)
    }
  }

  async function createBranch(repoPath: string, name: string, checkout: boolean) {
    await invoke('create_branch', { repoPath, name, checkout })
    await fetchBranches(repoPath)
  }

  async function switchBranch(repoPath: string, name: string) {
    await invoke('switch_branch', { repoPath, name })
    await fetchBranches(repoPath)
  }

  async function deleteBranch(repoPath: string, name: string, force: boolean) {
    await invoke('delete_branch', { repoPath, name, force })
    await fetchBranches(repoPath)
  }

  function currentBranch(repoPath: string): string {
    const repo = useRepoStore()
    const openRepo = repo.openRepos.get(repoPath)
    if (!openRepo) return ''
    const head = openRepo.branches.find(b => b.is_head)
    return head?.name ?? ''
  }

  return { fetchBranches, createBranch, switchBranch, deleteBranch, currentBranch }
})
```

- [ ] **Step 3: Commit**

```bash
git add git-client/src/stores/commits.ts git-client/src/stores/branches.ts
git commit -m "feat: adapt commits/branches stores for multi-repo"
```

---

## Task 6: Frontend — staging/diff/remote store 多仓库适配

**Files:**
- Modify: `git-client/src/stores/staging.ts`
- Modify: `git-client/src/stores/diff.ts`
- Modify: `git-client/src/stores/remote.ts`

- [ ] **Step 1: 改造 staging store**

将 `stagedFiles`/`unstagedFiles` 改为按 repoPath 索引的 Map。每个方法内部从 Map 读取/写入对应仓库的数据。

staging store 的改造模式（三个 store 相同）：将顶层 `ref<T>` 改为 `ref<Map<string, T>>`，方法内先获取 `map.get(repoPath)` 或创建默认值。

- [ ] **Step 2: 改造 diff store**

同上模式，`diffs` → `Map<string, FileDiff[]>`，`selectedFile` → `Map<string, string | null>`。

- [ ] **Step 3: 改造 remote store**

`remotes` → `Map<string, RemoteInfo[]>`，`syncing` → `Map<string, boolean>`。

- [ ] **Step 4: Commit**

```bash
git add git-client/src/stores/staging.ts git-client/src/stores/diff.ts git-client/src/stores/remote.ts
git commit -m "feat: adapt staging/diff/remote stores for multi-repo"
```

---

## Task 7: Frontend — 新建 RepoTabs 组件

**Files:**
- Create: `git-client/src/components/layout/RepoTabs.vue`

- [ ] **Step 1: 实现 RepoTabs 组件**

`git-client/src/components/layout/RepoTabs.vue`：

```vue
<template>
  <div v-if="repo.openRepos.size > 0" class="flex items-center border-b border-gray-700 bg-gray-850 h-[35px] px-2 gap-0.5">
    <div
      v-for="[path] in repo.openRepos"
      :key="path"
      class="flex items-center h-full px-3 cursor-pointer text-xs gap-1.5 transition-colors"
      :class="path === repo.activeRepoPath
        ? 'bg-gray-900 text-gray-100 border-t-2 border-blue-500'
        : 'bg-gray-800 text-gray-400 hover:text-gray-200 border-t-2 border-transparent'"
      :title="path"
      @click="repo.switchTab(path)"
    >
      <span>{{ repo.repoName(path) }}</span>
      <span
        class="text-gray-500 hover:text-red-400 ml-1 leading-none"
        @click.stop="handleClose(path)"
      >✕</span>
    </div>
    <n-button quaternary size="tiny" class="ml-1" @click="$emit('open')">+</n-button>
  </div>
</template>

<script setup lang="ts">
import { NButton } from 'naive-ui'
import { useRepoStore } from '../../stores/repo'

defineEmits<{ open: [] }>()

const repo = useRepoStore()

function handleClose(path: string) {
  repo.closeRepo(path)
}
</script>
```

- [ ] **Step 2: Commit**

```bash
git add git-client/src/components/layout/RepoTabs.vue
git commit -m "feat: add RepoTabs component"
```

---

## Task 8: Frontend — 新建 CommitList 组件

**Files:**
- Create: `git-client/src/components/commit/CommitList.vue`

- [ ] **Step 1: 实现 CommitList 组件**

`git-client/src/components/commit/CommitList.vue`：

```vue
<template>
  <div class="flex flex-col border-r border-gray-700" style="width: 420px;">
    <div class="flex items-center px-2.5 py-1.5 gap-1.5 border-b border-gray-700 bg-gray-850">
      <span class="text-gray-500 text-xs">🔍</span>
      <n-input
        v-model:value="repo.searchQuery"
        size="tiny"
        :placeholder="t('commit.searchPlaceholder')"
        clearable
        class="flex-1"
        @update:value="onSearchInput"
      />
      <n-select
        v-model:value="repo.searchFilter"
        :options="filterOptions"
        size="tiny"
        style="width: 90px"
      />
    </div>
    <div ref="scrollContainer" class="flex-1 overflow-y-auto" @scroll="onScroll">
      <div v-if="isSearching" class="text-xs text-gray-500 p-2">
        {{ repo.searchLoading ? 'Searching...' : `${repo.searchResults.length} results` }}
      </div>
      <div
        v-for="commit in displayCommits"
        :key="commit.id"
        class="px-3 py-2 border-b border-gray-750 cursor-pointer transition-colors"
        :class="commit.id === selectedId ? 'bg-blue-900/40' : 'hover:bg-gray-800'"
        @click="commits.selectCommit(repo.activeRepoPath!, commit)"
      >
        <div class="flex items-center gap-2">
          <span class="text-blue-400 text-xs font-mono">{{ commit.id.slice(0, 7) }}</span>
          <span class="text-gray-100 text-xs flex-1 truncate">{{ commit.message.split('\n')[0] }}</span>
          <span
            v-for="refName in commit.refs"
            :key="refName"
            class="text-xs px-1.5 py-0.5 rounded bg-green-900/40 text-green-400"
          >{{ refName }}</span>
        </div>
        <div class="text-gray-500 text-xs mt-0.5">{{ commit.author }} · {{ relativeTime(commit.time) }}</div>
      </div>
      <div v-if="activeOpenRepo?.loading" class="text-center text-gray-500 text-xs py-3">Loading...</div>
      <div v-if="!isSearching && activeOpenRepo?.hasMore && !activeOpenRepo?.loading" ref="loadMoreRef" class="h-1" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { NInput, NSelect } from 'naive-ui'
import { useRepoStore } from '../../stores/repo'
import { useCommitsStore } from '../../stores/commits'
import { invoke } from '../../utils/ipc'

const repo = useRepoStore()
const commits = useCommitsStore()

const scrollContainer = ref<HTMLElement | null>(null)
const loadMoreRef = ref<HTMLElement | null>(null)

const filterOptions = [
  { label: 'All', value: 'all' },
  { label: 'Message', value: 'message' },
  { label: 'Author', value: 'author' },
  { label: 'Hash', value: 'hash' },
  { label: 'File', value: 'file' },
]

const activeOpenRepo = computed(() => repo.activeRepo)

const selectedId = computed(() => activeOpenRepo.value?.selectedCommit?.id ?? null)

const isSearching = computed(() => repo.searchQuery.trim().length > 0)

const displayCommits = computed(() => {
  if (isSearching.value) return repo.searchResults
  return activeOpenRepo.value?.commits ?? []
})

let debounceTimer: ReturnType<typeof setTimeout> | null = null

function onSearchInput() {
  if (debounceTimer) clearTimeout(debounceTimer)
  if (!repo.searchQuery.trim()) {
    repo.searchResults = []
    return
  }
  debounceTimer = setTimeout(() => {
    repo.searchCommits()
  }, 300)
}

function relativeTime(timestamp: number): string {
  const diff = Math.floor(Date.now() / 1000) - timestamp
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`
  return new Date(timestamp * 1000).toLocaleDateString()
}

let observer: IntersectionObserver | null = null

function setupObserver() {
  observer?.disconnect()
  observer = new IntersectionObserver((entries) => {
    if (entries[0]?.isIntersecting && activeOpenRepo.value?.hasMore && !activeOpenRepo.value?.loading) {
      const c = activeOpenRepo.value.commits
      const last = c[c.length - 1]
      if (last && repo.activeRepoPath) {
        commits.fetchLogs(repo.activeRepoPath, 50, last.id)
      }
    }
  })
  if (loadMoreRef.value) observer.observe(loadMoreRef.value)
}

watch(() => repo.activeRepoPath, async (newPath) => {
  if (newPath) {
    const openRepo = repo.openRepos.get(newPath)
    if (openRepo && openRepo.commits.length === 0) {
      await commits.fetchLogs(newPath)
    }
    invoke('start_watch', { repoPath: newPath })
  }
  setupObserver()
})

onMounted(() => {
  if (repo.activeRepoPath) {
    const openRepo = repo.openRepos.get(repo.activeRepoPath)
    if (openRepo && openRepo.commits.length === 0) {
      commits.fetchLogs(repo.activeRepoPath)
    }
  }
  setupObserver()
})

onUnmounted(() => {
  observer?.disconnect()
  if (debounceTimer) clearTimeout(debounceTimer)
})
</script>
```

- [ ] **Step 2: Commit**

```bash
git add git-client/src/components/commit/CommitList.vue
git commit -m "feat: add CommitList component with search"
```

---

## Task 9: Frontend — 新建 CommitDetailPanel 组件

**Files:**
- Create: `git-client/src/components/commit/CommitDetailPanel.vue`

- [ ] **Step 1: 实现 CommitDetailPanel 组件**

`git-client/src/components/commit/CommitDetailPanel.vue`：

```vue
<template>
  <div v-if="selectedCommit" class="flex-1 overflow-y-auto p-3">
    <div class="text-xs text-gray-500 uppercase tracking-wide mb-2">Commit Detail</div>
    <div class="flex items-center gap-2 mb-1">
      <span class="font-mono text-blue-400 text-xs">{{ selectedCommit.id.slice(0, 7) }}</span>
      <span
        v-for="refName in selectedCommit.refs"
        :key="refName"
        class="text-xs px-1.5 py-0.5 rounded bg-green-900/40 text-green-400"
      >{{ refName }}</span>
    </div>
    <div class="text-gray-100 text-sm mb-1">{{ selectedCommit.message.split('\n')[0] }}</div>
    <div v-if="selectedCommit.message.split('\n').length > 1" class="text-gray-400 text-xs mt-1 whitespace-pre-wrap">
      {{ selectedCommit.message.split('\n').slice(1).join('\n') }}
    </div>
    <div class="text-gray-500 text-xs mt-1">
      {{ selectedCommit.author }} &lt;{{ selectedCommit.author_email }}&gt;
    </div>
    <div class="text-gray-500 text-xs">{{ new Date(selectedCommit.time * 1000).toLocaleString() }}</div>

    <div v-if="files.length > 0" class="mt-3 pt-2 border-t border-gray-700">
      <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">Changed Files</div>
      <div
        v-for="file in files"
        :key="file.path"
        class="text-xs py-0.5 flex items-center gap-1 cursor-pointer hover:text-blue-400"
        @click="diffStore.selectFile(repo.activeRepoPath!, file.path)"
      >
        <span class="font-mono w-4" :class="statusColor(file.status)">{{ statusIcon(file.status) }}</span>
        <span class="text-gray-300 truncate">{{ file.path }}</span>
      </div>
    </div>

    <div v-if="diffPreview" class="mt-3 pt-2 border-t border-gray-700">
      <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">Diff Preview</div>
      <pre class="bg-gray-900 border border-gray-700 rounded p-2 text-xs font-mono overflow-x-auto max-h-64">{{ diffPreview }}</pre>
    </div>
  </div>
  <div v-else class="flex-1 flex items-center justify-center text-gray-500 text-sm">
    Select a commit to view details
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRepoStore } from '../../stores/repo'
import { useDiffStore } from '../../stores/diff'
import type { DiffStatus } from '../../types/git'

const repo = useRepoStore()
const diffStore = useDiffStore()

const selectedCommit = computed(() => repo.activeRepo?.selectedCommit ?? null)

const files = computed(() => {
  const path = repo.activeRepoPath
  if (!path) return []
  const state = diffStore.diffStates.get(path)
  return state?.diffs ?? []
})

const diffPreview = computed(() => {
  const path = repo.activeRepoPath
  if (!path) return ''
  const state = diffStore.diffStates.get(path)
  if (!state?.selectedFile) return ''
  const file = state.diffs.find(f => f.path === state.selectedFile)
  if (!file) return ''
  return file.hunks
    .flatMap(h => h.lines.map(l => {
      if ('Addition' in l) return `+ ${l.Addition}`
      if ('Deletion' in l) return `- ${l.Deletion}`
      return `  ${l.Context}`
    }))
    .join('\n')
})

function statusIcon(status: DiffStatus): string {
  const map: Record<DiffStatus, string> = { Added: 'A', Modified: 'M', Deleted: 'D', Renamed: 'R', Copied: 'C' }
  return map[status]
}

function statusColor(status: DiffStatus): string {
  const map: Record<DiffStatus, string> = {
    Added: 'text-blue-400',
    Modified: 'text-green-400',
    Deleted: 'text-red-400',
    Renamed: 'text-yellow-400',
    Copied: 'text-yellow-400',
  }
  return map[status]
}
</script>
```

- [ ] **Step 2: Commit**

```bash
git add git-client/src/components/commit/CommitDetailPanel.vue
git commit -m "feat: add CommitDetailPanel component"
```

---

## Task 10: Frontend — 重组布局：AppLayout + App.vue

**Files:**
- Modify: `git-client/src/components/layout/AppLayout.vue`
- Modify: `git-client/src/App.vue`

- [ ] **Step 1: 修改 AppLayout 插入 RepoTabs 和新布局**

`git-client/src/components/layout/AppLayout.vue`：

```vue
<template>
  <div class="h-screen flex flex-col bg-gray-900 text-gray-100">
    <Toolbar @open="handleOpen" />
    <RepoTabs @open="handleOpen" />
    <div class="flex flex-1 overflow-hidden">
      <Sidebar />
      <main class="flex-1 flex overflow-hidden">
        <slot />
      </main>
    </div>
    <StatusBar />
  </div>
</template>

<script setup lang="ts">
import Toolbar from './Toolbar.vue'
import RepoTabs from './RepoTabs.vue'
import Sidebar from './Sidebar.vue'
import StatusBar from './StatusBar.vue'
import { open } from '@tauri-apps/plugin-dialog'
import { useRepoStore } from '../../stores/repo'
import { useBranchesStore } from '../../stores/branches'
import { useCommitsStore } from '../../stores/commits'
import { useMessage } from 'naive-ui'

const repo = useRepoStore()
const branches = useBranchesStore()
const commits = useCommitsStore()
const msg = useMessage()

async function handleOpen() {
  const selected = await open({ directory: true, multiple: false, title: 'Open Repository' })
  if (!selected) return
  try {
    await repo.openRepo(selected)
    await Promise.all([
      branches.fetchBranches(selected),
      commits.fetchLogs(selected),
    ])
    msg.success(`Opened: ${selected}`)
  } catch (e) {
    msg.error(`Failed to open: ${e}`)
  }
}
</script>
```

- [ ] **Step 2: 修改 App.vue 使用新布局**

`git-client/src/App.vue`：

```vue
<template>
  <n-config-provider :theme="theme">
    <n-message-provider>
      <AppLayout>
        <CommitList />
        <div class="flex-1 flex flex-col overflow-hidden">
          <CommitDetailPanel />
          <div class="border-t border-gray-700" style="height: 200px;">
            <div class="h-full flex flex-col">
              <StageArea class="flex-1 overflow-y-auto" />
              <CommitEditor />
            </div>
          </div>
        </div>
      </AppLayout>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { darkTheme } from 'naive-ui'
import AppLayout from './components/layout/AppLayout.vue'
import CommitList from './components/commit/CommitList.vue'
import CommitDetailPanel from './components/commit/CommitDetailPanel.vue'
import StageArea from './components/commit/StageArea.vue'
import CommitEditor from './components/commit/CommitEditor.vue'
import { useKeyboard } from './composables/useKeyboard'
import { useRepoStore } from './stores/repo'
import { useBranchesStore } from './stores/branches'
import { useRemoteStore } from './stores/remote'
import { useCommitsStore } from './stores/commits'
import { useAppStore } from './stores/app'

const repo = useRepoStore()
const branches = useBranchesStore()
const remote = useRemoteStore()
const commits = useCommitsStore()
const appStore = useAppStore()

const theme = computed(() => appStore.theme === 'dark' ? darkTheme : undefined)

useKeyboard([
  { key: 'l', ctrl: true, handler: () => {
    if (repo.activeRepoPath && branches.currentBranch(repo.activeRepoPath)) {
      remote.pullRemote(repo.activeRepoPath, 'origin', branches.currentBranch(repo.activeRepoPath))
    }
  }},
  { key: 'p', ctrl: true, shift: true, handler: () => {
    if (repo.activeRepoPath && branches.currentBranch(repo.activeRepoPath)) {
      remote.pushRemote(repo.activeRepoPath, 'origin', branches.currentBranch(repo.activeRepoPath))
    }
  }},
  { key: 'F5', handler: () => {
    if (repo.activeRepoPath) {
      commits.fetchLogs(repo.activeRepoPath)
      branches.fetchBranches(repo.activeRepoPath)
    }
  }},
])

onMounted(async () => {
  try {
    await appStore.loadSettings()
  } catch (e) {
    console.warn('loadSettings error:', e)
  }
})
</script>
```

- [ ] **Step 3: 删除旧组件**

删除：
- `git-client/src/components/graph/GraphView.vue`
- `git-client/src/components/graph/CommitCanvas.vue`
- `git-client/src/components/graph/CommitDetail.vue`
- `git-client/src/components/commit/CommitPanel.vue`

- [ ] **Step 4: Commit**

```bash
git add -A git-client/src/
git commit -m "feat: restructure layout with RepoTabs, CommitList, CommitDetailPanel"
```

---

## Task 11: Frontend — 适配现有组件的 repoPath 引用

**Files:**
- Modify: `git-client/src/components/commit/StageArea.vue`
- Modify: `git-client/src/components/commit/CommitEditor.vue`
- Modify: `git-client/src/components/layout/Toolbar.vue`
- Modify: `git-client/src/components/layout/StatusBar.vue`
- Modify: `git-client/src/components/branch/BranchTree.vue`
- Modify: `git-client/src/components/remote/RemotePanel.vue`
- Modify: `git-client/src/composables/useWorkdirWatcher.ts`

- [ ] **Step 1: StageArea.vue — `repo.repoPath` → `repo.activeRepoPath`**

将所有 `repo.repoPath` 替换为 `repo.activeRepoPath`，并在调用前加 `if (!repo.activeRepoPath) return` 守卫。

- [ ] **Step 2: CommitEditor.vue — 同上替换**

将 `repo.repoPath` 替换为 `repo.activeRepoPath`。

- [ ] **Step 3: Toolbar.vue — 移除 handleOpen（已移至 AppLayout），简化 emits**

Toolbar 不再负责打开仓库逻辑，改为 emit 事件。移除 `handleOpen` 函数和相关的 store import。按钮点击 emit `open` 事件。

```vue
<template>
  <div class="h-10 flex items-center px-3 bg-gray-800 border-b border-gray-700 gap-1">
    <n-button quaternary size="small" :loading="repo.loading" @click="$emit('open')">Open</n-button>
    <n-button quaternary size="small" @click="$emit('clone')">Clone</n-button>
    <n-divider vertical />
    <n-button quaternary size="small" @click="$emit('fetch')">Fetch</n-button>
    <n-button quaternary size="small" @click="$emit('pull')">Pull</n-button>
    <n-button quaternary size="small" @click="$emit('push')">Push</n-button>
    <div class="flex-1" />
    <n-button quaternary size="small" @click="toggleTheme">{{ app.theme === 'dark' ? '🌙' : '☀️' }}</n-button>
  </div>
</template>

<script setup lang="ts">
import { NButton, NDivider } from 'naive-ui'
import { useAppStore } from '../../stores/app'
import { useRepoStore } from '../../stores/repo'
import { useTheme } from '../../composables/useTheme'

defineEmits(['open', 'clone', 'fetch', 'pull', 'push'])

const app = useAppStore()
const repo = useRepoStore()
const { toggleTheme } = useTheme()
</script>
```

- [ ] **Step 4: StatusBar.vue — `repo.currentRepo` → `repo.activeRepo`**

将 `repo.currentRepo` 替换为 `repo.activeRepo`，`repo.repoPath` 替换为 `repo.activeRepoPath`，`branches.currentBranch` 替换为 `branches.currentBranch(repo.activeRepoPath!)`。

- [ ] **Step 5: BranchTree.vue — `repo.repoPath` → `repo.activeRepoPath`**

- [ ] **Step 6: RemotePanel.vue — `repo.repoPath` → `repo.activeRepoPath`**

- [ ] **Step 7: useWorkdirWatcher.ts — 适配事件携带 repoPath**

修改事件监听，从 payload 中提取 repoPath，仅刷新对应仓库数据：

```typescript
import { onEvent } from '../utils/event'
import { useRepoStore } from '../stores/repo'
import { useStagingStore } from '../stores/staging'

export function useWorkdirWatcher() {
  const repo = useRepoStore()

  onEvent('git:workdir-changed', (payload: any) => {
    const path = payload?.repoPath ?? repo.activeRepoPath
    if (!path || !repo.openRepos.has(path)) return
    const staging = useStagingStore()
    staging.refresh(path)
  })

  onEvent('git:index-changed', (payload: any) => {
    const path = payload?.repoPath ?? repo.activeRepoPath
    if (!path || !repo.openRepos.has(path)) return
    const staging = useStagingStore()
    staging.refresh(path)
  })

  onEvent('git:head-changed', (payload: any) => {
    const path = payload?.repoPath ?? repo.activeRepoPath
    if (!path || !repo.openRepos.has(path)) return
    const { useCommitsStore } = require('../stores/commits')
    const commits = useCommitsStore()
    commits.fetchLogs(path)
  })
}
```

- [ ] **Step 8: Commit**

```bash
git add git-client/src/components/ git-client/src/composables/
git commit -m "feat: adapt all components for multi-repo activeRepoPath"
```

---

## Task 12: Frontend — DiffView 适配多仓库

**Files:**
- Modify: `git-client/src/components/diff/DiffView.vue`

- [ ] **Step 1: DiffView 从 diffStates Map 读取数据**

修改 DiffView，使用 `diffStore.diffStates.get(repo.activeRepoPath)` 获取当前仓库的 diff 数据。

- [ ] **Step 2: Commit**

```bash
git add git-client/src/components/diff/DiffView.vue
git commit -m "feat: adapt DiffView for multi-repo diff states"
```

---

## Task 13: Integration Test — 构建验证

**Files:** 无新增

- [ ] **Step 1: 运行前端构建**

Run: `cd git-client && npx vite build`
Expected: 构建成功，无 TypeScript 错误

- [ ] **Step 2: 运行 Rust 编译**

Run: `cd git-client/src-tauri && cargo build`
Expected: 编译成功

- [ ] **Step 3: 运行 Rust 测试**

Run: `cd git-client/src-tauri && cargo test`
Expected: 所有测试通过

- [ ] **Step 4: 运行前端类型检查**

Run: `cd git-client && npx vue-tsc --noEmit`
Expected: 无类型错误

- [ ] **Step 5: 修复发现的问题**

如果以上步骤有错误，逐一修复直到全部通过。

- [ ] **Step 6: Commit（如有修复）**

```bash
git add -A
git commit -m "fix: resolve build/type errors from multi-repo refactor"
```
