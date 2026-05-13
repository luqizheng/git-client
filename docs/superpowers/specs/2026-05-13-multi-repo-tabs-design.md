# Multi-Repo Tabs + Commit List with Search

Date: 2026-05-13

## Summary

支持同时打开多个仓库，通过 Tab 切换；中间最大区域展示 commit log 列表并支持搜索（message/author/hash/file）。

## Layout

```
┌─────────────────────────────────────────────────────────┐
│ Toolbar (40px)                                          │
├─────────────────────────────────────────────────────────┤
│ Tab Bar (35px): [git-client ✕] [my-project ✕] [+]      │
├──────────┬──────────────┬──────────────────────────────┤
│ Sidebar  │ Commit List  │ Right Panel                   │
│ (220px)  │ (420px)      │                               │
│          │              │ ┌──────────────────────────┐  │
│ Branches │ 🔍 Search    │ │ Commit Detail            │  │
│  ⎇ main  │ ───────────  │ │ hash / message / author  │  │
│  ⎇ dev   │ a1b2c3d feat │ │ changed files            │  │
│          │ e4f5g6h fix  │ │ diff preview             │  │
│ Remotes  │ i7j8k9l chor │ └──────────────────────────┘  │
│  origin  │              │ ┌──────────────────────────┐  │
│          │              │ │ Stage + Commit Editor    │  │
│ Stash    │              │ │ Staged/Unstaged tabs     │  │
│          │              │ │ commit input + button    │  │
│          │              │ └──────────────────────────┘  │
├──────────┴──────────────┴──────────────────────────────┤
│ StatusBar (24px)                                        │
└─────────────────────────────────────────────────────────┘
```

### Tab Bar

- 位置：Toolbar 正下方
- 显示：仓库名（最后一级目录名），鼠标悬停 tooltip 显示完整路径
- 交互：点击切换、✕ 关闭、+ 打开新仓库
- 当前激活 Tab 有蓝色顶部边框 + 深色背景

### Commit List (左侧 420px)

- 顶部：搜索栏（输入框 + 筛选下拉）
- 列表：每行显示 commit 短 hash + message 首行 + 分支标签 + author + 相对时间
- 选中行高亮（深蓝背景 #094771）
- 无限滚动加载更多

### Right Panel

- 上半：CommitDetailPanel — 选中 commit 的完整信息（hash、message、author/date、变更文件列表、diff 预览）
- 下半 (200px 固定)：StageArea + CommitEditor — Staged/Unstaged tab 切换 + commit 输入框 + Commit 按钮

## Implementation Approach: Hybrid

- **Tab 切换**：前端 Pinia 缓存每个 repo 的 commits/branches，切换即时渲染
- **搜索**：走后端 `search_commits` API（git2 revwalk + 过滤），覆盖全量历史

## Component Architecture

### New Components

| Component | Location | Purpose |
|---|---|---|
| RepoTabs.vue | components/layout/ | Tab 栏，管理多仓库切换/关闭/新增 |
| CommitList.vue | components/commit/ | 左侧 commit 列表 + 搜索栏 |
| CommitDetailPanel.vue | components/commit/ | 右侧上方 commit 详情 |

### Modified Components

| Component | Change |
|---|---|
| AppLayout.vue | Toolbar 下方插入 RepoTabs，主内容区改为左右分栏 |
| CommitPanel.vue | 拆分为 CommitDetailPanel + StageArea/CommitEditor |

### Removed Components

| Component | Reason |
|---|---|
| GraphView.vue | 功能合并到 CommitList |
| CommitCanvas.vue | 功能合并到 CommitList |
| CommitDetail.vue | 功能合并到 CommitDetailPanel |

## Data Model Changes

### Pinia: repo store

```typescript
// Before (single repo)
currentRepo: Ref<RepoState | null>
repoPath: Ref<string>

// After (multi repo)
openRepos: Ref<Map<string, OpenRepo>>
activeRepoPath: Ref<string | null>
recentRepos: Ref<string[]>

interface Commit {
  id: string
  message: string
  author: string
  author_email: string
  time: number
  parent_ids: string[]
  refs: string[]              // 分支/标签名列表，如 ["main", "v1.0"]
}

interface OpenRepo {
  state: RepoState
  commits: Commit[]
  branches: Branch[]
  selectedCommit: Commit | null
  hasMore: boolean
  loading: boolean
}
```

Commit.refs 数据来源：后端 `get_log` / `search_commits` 在遍历每个 commit 时，通过 `repo.references()` 查找指向该 commit 的分支和标签名，附加到返回的 Commit 结构中。前端 Commit 列表据此渲染分支标签。

### Pinia: commits store

```typescript
// Before
commits / selectedCommit / loading / hasMore  // 顶层 refs

// After: 这些字段移入 OpenRepo
// commits store 的方法改为接受 repoPath 参数，操作对应 OpenRepo
fetchLogs(repoPath, limit?, after?)
selectCommit(repoPath, commit)
clearCommits(repoPath)
```

### Pinia: 新增 search state (放 repo store)

```typescript
searchQuery: Ref<string>
searchFilter: Ref<SearchFilter>
searchResults: Ref<Commit[]>
searchLoading: Ref<boolean>

type SearchFilter = 'all' | 'message' | 'author' | 'hash' | 'file'
```

## Backend API Changes

### New IPC Commands

**`search_commits`**

```rust
#[tauri::command]
async fn search_commits(
    repos: State<AppState>,
    repo_path: String,
    query: String,
    filter: SearchFilter,
    limit: Option<u32>,
) -> Result<Vec<Commit>, AppError>

enum SearchFilter {
    All,
    Message,
    Author,
    Hash,
    File,
}
```

实现逻辑：
1. 从 RepoManager 获取 repo
2. `git2::Repository::revwalk()` 从 HEAD 遍历
3. 对每个 commit 按 filter 匹配：
   - Message: `commit.message().to_lowercase().contains(query.to_lowercase())`
   - Author: `author.name()` 或 `author.email()` 包含 query（大小写不敏感）
   - Hash: `commit.id().to_string().starts_with(query)`
   - File: 遍历 commit diff 的文件名包含 query
   - All: 以上任一匹配即命中
4. 收集匹配结果到 limit 截止，返回 `Vec<Commit>`

**`close_repo`**

```rust
#[tauri::command]
async fn close_repo(
    repos: State<AppState>,
    repo_path: String,
) -> Result<(), AppError>
```

从 RepoManager 的 HashMap 移除仓库。

### Modified Commands

- `init_repo` — 注册到 RepoManager（当前缺失）
- `clone_repo` — 注册到 RepoManager（当前缺失）

## Frontend Search Interaction

- 输入框 300ms 防抖，触发 `invoke("search_commits", ...)`
- 搜索结果替换 commit 列表显示
- 清空搜索框恢复原始 commit 列表
- 搜索中列表底部显示 "Searching..." 指示器
- 筛选下拉：All / Message / Author / Hash / File

## Tab Lifecycle

1. 打开仓库：`repo.openRepo(path)` → 后端注册 RepoManager → 前端添加到 openRepos Map → 激活该 Tab
2. 切换 Tab：设置 `activeRepoPath` → UI 从 openRepos 缓存读取渲染
3. 关闭 Tab：从 openRepos 移除 → 若关闭的是活跃 Tab 则切换到相邻 Tab → 调用后端 `close_repo`
4. 窗口启动：从 recentRepos 恢复上次打开的仓库（可选，后续迭代）

## Additional Store Changes (审查补充)

以下 store 也持有单实例数据，需改造为多仓库索引：

### staging store

```typescript
// Before
stagedFiles: Ref<StagedFile[]>
unstagedFiles: Ref<StagedFile[]>

// After
fileStates: Ref<Map<string, { staged: StagedFile[], unstaged: StagedFile[] }>>
```

方法签名不变（已通过参数接收 repoPath），内部改为操作 `fileStates.get(repoPath)`。

### diff store

```typescript
// Before
diffs: Ref<FileDiff[]>
selectedFile: Ref<string | null>

// After
diffStates: Ref<Map<string, { diffs: FileDiff[], selectedFile: string | null }>>
```

### remote store

```typescript
// Before
remotes: Ref<RemoteInfo[]>
syncing: Ref<boolean>

// After
remoteStates: Ref<Map<string, { remotes: RemoteInfo[], syncing: boolean }>>
```

### branches store

branches 数据已放入 OpenRepo（见 repo store 改造），branches store 方法改为接受 repoPath 参数，操作 `openRepos.get(repoPath).branches`。

## Composable & Component Multi-Repo Migration

所有使用 `repo.repoPath` 的组件/composable 替换为 `repo.activeRepoPath`：

| 文件 | 引用次数 | 改动 |
|---|---|---|
| useWorkdirWatcher.ts | 4 处 | `repo.repoPath` → `repo.activeRepoPath` |
| BranchTree.vue | 1 处 | `repo.repoPath` → `repo.activeRepoPath` |
| RemotePanel.vue | 2 处 | `repo.repoPath` → `repo.activeRepoPath` |
| CommitEditor.vue | 2 处 | `repo.repoPath` → `repo.activeRepoPath` |
| StageArea.vue | 2 处 | `repo.repoPath` → `repo.activeRepoPath` |
| StatusBar.vue | 3 处 | `repo.currentRepo` → `repo.activeRepo` |

## Tauri Event RepoPath 标识

后端 `start_watch` 推送的事件需携带 `repoPath` 字段，前端 `useWorkdirWatcher` 根据事件中的 repoPath 分发到对应 store：

```typescript
// Before: 事件无 repoPath
onEvent('git:workdir-changed', (payload) => {
  staging.refresh(repo.repoPath)  // 无法区分来源
})

// After: 事件携带 repoPath
onEvent('git:workdir-changed', (payload: { repoPath: string }) => {
  if (openRepos.has(payload.repoPath)) {
    staging.refresh(payload.repoPath)
  }
})
```

## Theme Compatibility

- 所有新增组件必须同时支持 dark/light 主题
- 使用 CSS 变量（与现有主题系统一致）
- Commit list 选中色：dark=#094771, light=#cce8ff
