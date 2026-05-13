# Git客户端设计文档 — 数据流与IPC

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
