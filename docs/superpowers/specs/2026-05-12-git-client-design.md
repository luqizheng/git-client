# Git客户端设计文档

> 媲美GitKraken的桌面Git客户端

## 概述

面向个人开发者的桌面Git客户端，基于Tauri + Vue3 + libgit2构建，提供图形化提交历史、分支可视化、代码Diff查看和远程仓库管理。

## 技术栈

| 层 | 技术 |
|----|------|
| 桌面框架 | Tauri 2.x |
| 前端 | Vue3 + TypeScript |
| 状态管理 | Pinia |
| UI组件库 | Naive UI |
| 代码高亮 | Monaco Editor (diff模式) |
| CSS | UnoCSS |
| i18n | vue-i18n |
| 图形渲染 | Canvas 2D |
| 后端 | Rust |
| Git操作 | git2 (libgit2绑定) |
| 异步运行时 | tokio |
| SSH | git2内置SSH传输（libssh2） |
| 文件监听 | notify |

## 平台支持

Windows / macOS / Linux

## 架构

### 三层架构

1. **UI层**：Vue3负责渲染、交互、状态展示
2. **IPC桥**：Tauri invoke通信，前后端解耦
3. **核心层**：Rust + git2 crate，所有Git操作在此完成

```
┌─────────────────────────────────────────────┐
│                  Tauri Window                │
│  ┌─────────────────────────────────────────┐ │
│  │            Vue3 + TypeScript            │ │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌────────┐ │ │
│  │  │Repo  │ │Graph │ │Diff  │ │Remote  │ │ │
│  │  │Panel │ │View  │ │View  │ │Panel   │ │ │
│  │  └──────┘ └──────┘ └──────┘ └────────┘ │ │
│  │         Pinia State Store               │ │
│  └──────────────┬──────────────────────────┘ │
│                 │ Tauri IPC (invoke)          │
│  ┌──────────────▼──────────────────────────┐ │
│  │            Rust Core                    │ │
│  │  ┌──────────┐ ┌──────────┐ ┌─────────┐ │ │
│  │  │Repository│ │GitOps    │ │Remote   │ │ │
│  │  │Service   │ │Service   │ │Service  │ │ │
│  │  └────┬─────┘ └────┬─────┘ └────┬────┘ │ │
│  │       └─────────────┼────────────┘      │ │
│  │               ┌─────▼─────┐             │ │
│  │               │  git2     │             │ │
│  │               │ (libgit2) │             │ │
│  │               └───────────┘             │ │
│  └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

关键决策：
- 前端不直接访问文件系统，所有IO走Rust
- Pinia管理UI状态，Rust管理Git状态
- 异步通信：前端invoke后端命令，后端通过event emit推送变更

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

## 数据流

### 请求-响应流

用户点击 → Vue组件 → Pinia Action → invoke IPC → Rust command → service → git2 → 返回Result → Pinia Store更新 → UI刷新

### 事件推送流

Rust后台 → app.emit → Tauri Event System → Vue listen → Pinia Action → UI刷新

事件类型：
- `ref-updated`：分支/标签引用变更
- `index-changed`：暂存区索引变更
- `workdir-changed`：工作区文件变更
- `head-changed`：HEAD指针变更
- `fetch-progress`：拉取/推送进度
- `merge-conflict`：合并冲突通知
- `auth-required`：需要用户输入凭证

### 文件监听流

notify crate监听 .git/refs/ + .git/HEAD + .git/index → 精确检测变更类型 → emit细分事件 → 前端按需刷新

### Pinia Store结构

| Store | 数据 |
|-------|------|
| repo | 当前仓库路径、状态、配置 |
| commits | 提交列表、选中提交、分页 |
| branches | 本地/远程分支、当前分支 |
| diff | 当前diff结果、选中文件 |
| staging | 暂存区文件列表、工作区变更 |
| remote | 远程仓库列表、同步状态 |
| app | 全局UI状态：主题、语言、面板布局 |

## IPC命令清单

| 命令 | 输入 | 输出 |
|------|------|------|
| open_repo | path: string | RepoState |
| get_log | limit: u32, after: Option\<string\> | Vec\<Commit\> |
| get_diff | commit_id: string | Vec\<FileDiff\> |
| get_working_diff | - | Vec\<FileDiff\> |
| stage_files | paths: Vec\<string\> | ok |
| unstage_files | paths: Vec\<string\> | ok |
| commit | message: string, files: Vec\<string\>, amend: bool | Commit |
| create_branch | name: string, checkout: bool | Branch |
| switch_branch | name: string | ok |
| delete_branch | name: string, force: bool | ok |
| merge | branch: string | MergeResult |
| rebase | branch: string | RebaseResult |
| fetch | remote: string | FetchResult |
| pull | remote: string, branch: string | PullResult |
| push | remote: string, branch: string | PushResult |
| add_remote | name: string, url: string | ok |
| init_repo | path: string, bare: bool | RepoState |
| clone_repo | url: string, path: string | RepoState |
| stash_save | message: string | StashEntry |
| stash_pop | index: u32 | ok |
| resolve_conflict | path: string, content: string | ok |
| cherry_pick | commit_id: string | CherryPickResult |
| get_credentials | remote: string | Credential |
| set_credentials | remote: string, cred: Credential | ok |

## 提交图算法

### 布局算法

采用拓扑排序 + 泳道分配（Lane-based）算法，与GitKraken同类方案：

1. **拓扑排序**：从HEAD回溯，按提交时间倒序排列，保证父提交始终在子提交之后
2. **泳道分配**：每个分支分配一条纵向泳道（lane），分支起点和终点处绘制连接线
3. **合并连接**：合并提交从多个泳道汇入目标泳道，贝塞尔曲线连接
4. **颜色映射**：每个分支/泳道绑定唯一颜色，颜色从预设调色板循环取用

### 渲染策略

- Canvas 2D分层渲染：背景层（网格）、连接线层（贝塞尔曲线）、节点层（提交圆点）、标签层（分支名/标签名）
- 视口裁剪：仅渲染可见区域内的提交节点，超出视口的跳过
- 请求动画帧：滚动/缩放时通过requestAnimationFrame节流渲染

### 大仓库性能

- **增量加载**：get_log支持cursor分页，初始加载最近500条，向上滚动时追加请求
- **虚拟滚动**：前端仅维护可见区域的DOM/Canvas节点，滚动时动态替换
- **后台预计算**：Rust侧后台线程预计算提交图布局，结果缓存，前端按需取用
- **防抖刷新**：文件监听触发刷新时，300ms防抖，避免频繁重绘

## 国际化

基于vue-i18n实现可扩展i18n架构，首版支持中英文。locale文件采用JSON格式，按模块拆分。

## 主题

深色主题优先，支持亮色切换。CSS变量控制主题色，Naive UI内置深色模式。

## Diff查看器

使用Monaco Editor的diff模式渲染，支持side-by-side、unified视图切换，行内编辑用于冲突解决，diff导航（上一个/下一个变更块）。

## 冲突解决

### 交互流程

1. 合并/变基触发冲突 → Rust返回冲突文件列表
2. 前端打开ConflictResolver，展示三栏视图：Ours / Base / Theirs
3. 每个冲突块（hunk）可独立选择采用哪一方或手动编辑
4. 全部冲突解决后，点击"完成合并"调用resolve_conflict

### 三栏视图

- 只读模式：Ours和Theirs栏不可编辑，Base栏为只读参考
- 编辑模式：结果栏可手动编辑，融合多方修改
- 冲突块标记：红色/绿色/蓝色分别标记Ours/Base/Theirs

## 凭证安全

使用操作系统原生凭证管理器存储敏感信息：

| 平台 | 凭证管理器 |
|------|-----------|
| Windows | Windows Credential Manager |
| macOS | macOS Keychain |
| Linux | Secret Service API (libsecret) |

Rust侧通过keyring crate统一访问各平台凭证管理器。SSH密钥仅存储路径引用，不复制密钥内容。HTTPS凭证（用户名/Token）加密存入系统凭证管理器。

## 测试策略

| 层 | 测试类型 | 工具 |
|----|---------|------|
| Rust models | 单元测试 | #[test] + assert |
| Rust services | 单元测试（mock git2） | mockall |
| Rust commands | 集成测试 | tauri::test |
| Vue组件 | 单元测试 | Vitest + Vue Test Utils |
| Pinia Store | 单元测试 | Vitest + pinia testing |
| 全流程 | E2E测试 | Playwright + Tauri WebDriver |
| 提交图 | 快照测试 | Canvas截图对比 |

CI流程：Rust cargo test → Vue vitest → Playwright E2E → 构建发布包

## 工程审查修复

### E1: git2异步适配

git2是同步库，所有调用在Tauri command中会阻塞主线程。解决方案：

```rust
#[tauri::command]
async fn get_log(state: State<'_, AppState>, limit: u32, after: Option<String>) -> Result<Vec<Commit>, AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let repo = repos.get_repo()?;
        commit_service::log(&repo, limit, after.as_deref())
    }).await?
}
```

所有git2调用统一通过`spawn_blocking`在专用线程池执行。

### E2: Repository生命周期管理

git2::Repository不是Send，不能跨线程共享。设计AppState：

```rust
struct AppState {
    repos: Arc<Mutex<RepoManager>>,
}

struct RepoManager {
    handles: HashMap<PathBuf, RepoHandle>,
}

struct RepoHandle {
    path: PathBuf,
}
```

每次操作重新open repository（git2::Repository::open），开销约1-5ms可接受。避免Mutex锁竞争问题。

### E3: 游标分页

get_log改为游标分页：

| 命令 | 输入 | 输出 |
|------|------|------|
| get_log | limit: u32, after: Option\<String\> | Vec\<Commit\> |

Rust侧实现：
```rust
fn log(repo: &Repository, limit: u32, after: Option<&str>) -> Result<Vec<Commit>> {
    let mut revwalk = repo.revwalk()?;
    revwalk.push_head()?;
    if let Some(id) = after {
        revwalk.hide(Oid::from_str(id)?)?;
    }
    // ...
}
```

### E4: SSH方案

移除ssh2 crate依赖。git2自带libssh2支持，通过RemoteCallbacks配置SSH认证：

```rust
let mut callbacks = RemoteCallbacks::new();
callbacks.credentials(|url, username, _| {
    // 从keyring获取或提示用户输入
    Cred::ssh_key_from_agent(username.unwrap_or("git"))
});
```

### E5: AppState注入Tauri

```rust
fn main() {
    let state = AppState {
        repos: Arc::new(Mutex::new(RepoManager::new())),
    };
    tauri::Builder::default()
        .manage(state)
        .invoke_handler(tauri::generate_handler![...])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### E6: 统一IPC返回类型

已在"错误处理"章节合并定义。所有命令统一返回`Result<T, AppError>`，AppError使用thiserror + Serialize实现。

### E7: 事件细分

`repo-changed`拆分为：

| 事件 | 触发条件 | 前端响应 |
|------|---------|---------|
| ref-updated | .git/refs/变更 | 刷新分支列表、提交图 |
| index-changed | .git/index变更 | 刷新暂存区状态 |
| workdir-changed | 工作区文件变更 | 刷新工作区diff |
| head-changed | .git/HEAD变更 | 更新当前分支显示 |

### E8: commit支持amend

commit命令增加amend参数：

| 命令 | 输入 | 输出 |
|------|------|------|
| commit | message: string, files: Vec\<string\>, amend: bool | Commit |

### E9: init_repo命令

新增IPC命令：

| 命令 | 输入 | 输出 |
|------|------|------|
| init_repo | path: string, bare: bool | RepoState |

### E10: Diff查看器改为Monaco

首版直接使用Monaco Editor的diff模式，支持：
- side-by-side diff
- unified diff
- 行内编辑（冲突解决需要）
- diff导航（上一个/下一个变更块）

移除diff2html依赖。

### E11: 文件监听精确化

notify仅监听以下路径：
- `.git/refs/` — 分支/标签变更
- `.git/HEAD` — 当前分支切换
- `.git/index` — 暂存区变更

忽略`.git/objects/`、`.git/logs/`等高频写入目录。

### E12: 键盘快捷键

| 快捷键 | 功能 |
|--------|------|
| Ctrl+P | 切换仓库 |
| Ctrl+S | 提交 |
| Ctrl+Shift+S | 提交并推送 |
| Ctrl+L | 拉取 |
| Ctrl+Shift+P | 推送 |
| Ctrl+B | 创建分支 |
| Ctrl+Shift+B | 切换分支 |
| Ctrl+D | 查看Diff |
| Ctrl+G | 跳转到提交 |
| Ctrl+Z | 撤销（工作区文件恢复） |
| F5 | 刷新仓库状态 |

## 配置持久化

用户偏好配置通过Tauri的`app_data_dir`存储：

| 配置项 | 存储方式 | 文件 |
|--------|---------|------|
| 主题/语言/面板布局 | JSON文件 | `~/.config/git-client/settings.json` |
| 仓库列表/最近打开 | JSON文件 | `~/.config/git-client/repos.json` |
| Git用户配置 | 读写仓库.git/config | 由git2操作 |
| HTTPS凭证 | 操作系统凭证管理器 | keyring crate |
| SSH密钥路径 | 操作系统凭证管理器 | keyring crate |

Rust侧通过`tauri::api::path::app_data_dir`获取平台特定配置目录。前端通过IPC命令读写配置。

## 窗口管理

单窗口多标签页策略：

- 每个打开的仓库对应一个标签页
- 标签页栏位于工具栏下方
- 支持拖拽排序标签页
- 关闭最后一个标签页显示欢迎页
- 窗口大小/位置记忆到配置文件

## 日志方案

| 层 | 日志方案 |
|----|---------|
| Rust | `tracing` crate，输出到文件 `app_data_dir/logs/` |
| Vue | `console.log` + 自定义logger，开发环境输出到DevTools |
| 生产环境 | Rust日志rotate（按大小5MB，保留5个），Vue日志不上报 |

```rust
tracing_subscriber::fmt()
    .with_max_level(tracing::Level::INFO)
    .with_rolling_file(app_data_dir, Rolling::Hourly)
    .init();
```

## 开发体验

### DX1: IPC类型安全

使用Tauri的TypeScript类型生成，从Rust命令签名自动生成前端类型：

```toml
# Cargo.toml
[build-dependencies]
tauri-build = { version = "2", features = ["codegen"] }
```

`cargo tauri dev`构建时自动生成`src/types/ipc.d.ts`，前端直接import使用，无需手动维护。

同时封装IPC调用层，统一处理loading和error：

```typescript
// composables/useGit.ts
export function useGit() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
    loading.value = true
    error.value = null
    try {
      return await window.__TAURI_INTERNALS__.invoke(cmd, args)
    } catch (e) {
      error.value = String(e)
      throw e
    } finally {
      loading.value = false
    }
  }

  return { invoke, loading, error }
}
```

### DX2: 开发环境热重载

dev工作流：

- **前端**：Vite HMR，修改Vue/CSS即时生效
- **Rust**：`cargo tauri dev`自动重编译，约10-30秒
- **加速策略**：`#[cfg(debug_assertions)]`条件下跳过重量级初始化（文件监听、日志rotate）
- **Mock模式**：前端通过环境变量`VITE_MOCK=true`启用纯前端mock，不依赖Rust后端

```typescript
// utils/ipc.ts
const isMock = import.meta.env.VITE_MOCK === 'true'

export async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (isMock) return mockData[cmd] as T
  return window.__TAURI_INTERNALS__.invoke(cmd, args)
}
```

### DX3: Monaco Editor集成

使用vite-plugin-monaco-editor插件集成：

```typescript
// vite.config.ts
import monacoEditorPlugin from 'vite-plugin-monaco-editor'

export default defineConfig({
  plugins: [
    vue(),
    monacoEditorPlugin({
      languageWorkers: ['editorWorkerService', 'diff']
    })
  ]
})
```

仅加载diff worker，避免加载全部语言包。Monaco diff editor使用方式：

```typescript
monaco.editor.createDiffEditor(container, {
  theme: 'vs-dark',
  renderSideBySide: true,
  readOnly: false,
})
```

### DX4: 事件监听自动清理

封装composable，利用Vue生命周期自动管理：

```typescript
// composables/useGitEvent.ts
export function useGitEvent(event: string, handler: (payload: any) => void) {
  const unlisten = ref<(() => void) | null>(null)

  onMounted(async () => {
    unlisten.value = await listen(event, (e) => handler(e.payload))
  })

  onUnmounted(() => {
    unlisten.value?.()
  })
}
```

### DX5: git2操作重试机制

封装带重试的操作执行器：

```rust
// utils/retry.rs
pub fn with_retry<F, T>(op: F, max_retries: u32) -> Result<T, AppError>
where F: Fn() -> Result<T, AppError> {
    let mut attempts = 0;
    loop {
        match op() {
            Ok(v) => return Ok(v),
            Err(e) if attempts < max_retries => {
                attempts += 1;
                std::thread::sleep(Duration::from_millis(100 * 2u64.pow(attempts)));
            }
            Err(e) => return Err(e),
        }
    }
}
```

对stage_files、commit、switch_branch等易因文件锁失败的操作使用重试。

### DX6: 工作区文件监听debounce

工作区文件变更通过Chokidar（Vite内置）+ 自定义300ms debounce监听：

```typescript
// composables/useWorkdirWatcher.ts
export function useWorkdirWatcher(repoPath: Ref<string>) {
  const { invoke } = useGit()
  let timer: number | null = null

  useGitEvent('workdir-changed', () => {
    if (timer) clearTimeout(timer)
    timer = window.setTimeout(() => {
      invoke('get_working_diff')
    }, 300)
  })
}
```

### DX7: commit消息模板

CommitEditor组件支持Conventional Commits模板选择：

| 模板 | 前缀 |
|------|------|
| feat | feat: |
| fix | fix: |
| docs | docs: |
| refactor | refactor: |
| chore | chore: |

下拉选择模板 + 输入框自动填充前缀。模板列表可自定义扩展。

### DX8: 拖拽操作

分支图支持拖拽交互：

- 拖拽分支节点到目标分支 → 弹出merge/rebase选择
- 拖拽commit节点 → 弹出cherry-pick选项
- 侧边栏分支项拖拽 → 同上

使用HTML5 Drag & Drop API实现，Canvas节点通过mousedown/mousemove/mouseup模拟拖拽。
