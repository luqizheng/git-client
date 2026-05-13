# Git客户端设计文档 — 前后端模块

## 前端模块

### 整体布局

```
┌──────────────────────────────────────────────────┐
│  菜单栏 / 工具栏                                   │
├──────────┬───────────────────────────────────────┤
│          │  提交图 / 分支图 (Canvas)               │
│  侧边栏   │  ┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐ │
│          │  │  *──*──*  main                     │ │
│  ·仓库   │  │     └──*──*  feature/login         │ │
│  ·分支   │  └─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┘ │
│  ·标签   ├───────────────────────────────────────┤
│  ·远程   │  详情面板 (Diff / 提交信息 / 文件列表)    │
│  ·暂存区  │                                       │
│          │                                       │
├──────────┴───────────────────────────────────────┤
│  状态栏 (当前分支 / 同步状态 / 提交数)               │
└──────────────────────────────────────────────────┘
```

### 模块划分

| 模块 | 职责 | 关键组件 |
|------|------|---------|
| RepoPanel | 仓库列表、切换、克隆 | RepoList, CloneDialog |
| GraphView | 提交图/分支图渲染 | CommitCanvas, BranchLane, CommitNode |
| DiffView | 代码差异展示 | SplitDiff, UnifiedDiff, FileTree |
| Sidebar | 分支/标签/远程/暂存区导航 | BranchTree, TagList, StagedFiles |
| StatusBar | 底部状态信息 | BranchBadge, SyncIndicator |
| CommitPanel | 提交消息编辑、暂存操作 | CommitEditor, StageArea |
| ConflictResolver | 冲突解决界面 | MergeEditor, ConflictBlock |
| RemotePanel | 远程仓库管理、SSH配置 | RemoteList, SshConfig |

### 前端目录结构

```
src/
├── App.vue
├── main.ts
├── assets/
│   ├── styles/
│   │   ├── variables.css
│   │   └── themes/
│   │       ├── dark.css
│   │       └── light.css
│   └── icons/
├── components/
│   ├── layout/
│   │   ├── AppLayout.vue
│   │   ├── Sidebar.vue
│   │   ├── Toolbar.vue
│   │   └── StatusBar.vue
│   ├── repo/
│   │   ├── RepoPanel.vue
│   │   ├── RepoList.vue
│   │   └── CloneDialog.vue
│   ├── graph/
│   │   ├── GraphView.vue
│   │   ├── CommitCanvas.vue
│   │   └── CommitDetail.vue
│   ├── diff/
│   │   ├── DiffView.vue
│   │   ├── FileTree.vue
│   │   └── MonacoDiff.vue
│   ├── commit/
│   │   ├── CommitPanel.vue
│   │   ├── CommitEditor.vue
│   │   └── StageArea.vue
│   ├── branch/
│   │   ├── BranchTree.vue
│   │   └── BranchDialog.vue
│   ├── remote/
│   │   ├── RemotePanel.vue
│   │   └── SshConfig.vue
│   └── conflict/
│       ├── ConflictResolver.vue
│       └── ThreeWayDiff.vue
├── stores/
│   ├── repo.ts
│   ├── commits.ts
│   ├── branches.ts
│   ├── diff.ts
│   ├── staging.ts
│   ├── remote.ts
│   └── app.ts
├── composables/
│   ├── useGit.ts
│   ├── useTheme.ts
│   ├── useI18n.ts
│   └── useKeyboard.ts
├── i18n/
│   ├── index.ts
│   └── locales/
│       ├── en.json
│       └── zh.json
├── types/
│   ├── git.d.ts
│   └── ipc.d.ts
└── utils/
    ├── ipc.ts
    └── event.ts
```

## 后端模块

### 目录结构

```
src-tauri/
├── src/
│   ├── main.rs
│   ├── lib.rs
│   ├── commands/
│   │   ├── mod.rs
│   │   ├── repo.rs
│   │   ├── commit.rs
│   │   ├── branch.rs
│   │   ├── remote.rs
│   │   ├── diff.rs
│   │   └── stash.rs
│   ├── services/
│   │   ├── mod.rs
│   │   ├── repo_service.rs
│   │   ├── commit_service.rs
│   │   ├── branch_service.rs
│   │   ├── remote_service.rs
│   │   ├── diff_service.rs
│   │   ├── merge_service.rs
│   │   └── stash_service.rs
│   ├── models/
│   │   ├── mod.rs
│   │   ├── commit.rs
│   │   ├── branch.rs
│   │   ├── diff.rs
│   │   ├── remote.rs
│   │   ├── repo.rs
│   │   └── stash.rs
│   └── utils/
│       ├── mod.rs
│       ├── credential.rs
│       ├── error.rs
│       └── retry.rs
└── Cargo.toml
```

### 三层结构

| 层 | 职责 | 示例 |
|----|------|------|
| commands | 接收IPC调用，参数校验，返回序列化结果 | `open_repo(path) → RepoState` |
| services | 业务逻辑，调用git2执行操作 | `commit_service::log(repo, limit)` |
| models | 纯数据结构，Serialize/Deserialize | `Commit { id, message, author, time }` |

### 核心数据模型

```rust
struct Commit {
    id: String,
    message: String,
    author: String,
    author_email: String,
    time: i64,
    parent_ids: Vec<String>,
}

struct Branch {
    name: String,
    is_remote: bool,
    is_head: bool,
    target_commit_id: String,
    upstream: Option<String>,
}

struct FileDiff {
    path: String,
    old_path: Option<String>,
    status: DiffStatus,
    hunks: Vec<Hunk>,
}

enum DiffStatus {
    Added,
    Modified,
    Deleted,
    Renamed,
    Copied,
}

struct Hunk {
    old_start: u32,
    old_lines: u32,
    new_start: u32,
    new_lines: u32,
    lines: Vec<DiffLine>,
}

enum DiffLine {
    Context(String),
    Addition(String),
    Deletion(String),
}

struct RepoState {
    path: String,
    head_branch: Option<String>,
    head_commit_id: Option<String>,
    is_bare: bool,
    is_empty: bool,
}

struct StashEntry {
    index: u32,
    message: String,
    commit_id: String,
}

struct ConflictFile {
    path: String,
    ours_modified: bool,
    theirs_modified: bool,
}

struct Credential {
    username: String,
    password: Option<String>,
    ssh_key_path: Option<String>,
}
```

### 关键依赖

| crate | 用途 |
|-------|------|
| git2 | libgit2 Rust绑定，核心Git操作 |
| tauri | 桌面框架、IPC、窗口管理 |
| serde | 序列化/反序列化，IPC数据传输 |
| tokio | 异步运行时，网络操作 |
| ssh2 | 已移除，SSH由git2内置libssh2支持 |
| notify | 文件系统监听，实时检测仓库变更 |
| keyring | 跨平台操作系统凭证管理器访问 |
| thiserror | 错误类型派生宏 |
| tracing | 结构化日志，文件输出+rotate |

### 错误处理

所有命令统一返回`Result<T, AppError>`，AppError使用thiserror实现：

```rust
#[derive(Debug, thiserror::Error)]
enum AppError {
    #[error("Git error: {0}")]
    Git(#[from] git2::Error),
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Credential error: {0}")]
    Credential(String),
    #[error("Merge conflict: {0} files")]
    Conflict(Vec<ConflictFile>),
}

impl serde::Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where S: serde::Serializer {
        serializer.serialize_str(self.to_string().as_str())
    }
}
```

前端统一通过try/catch捕获IPC错误，toast展示错误信息。
