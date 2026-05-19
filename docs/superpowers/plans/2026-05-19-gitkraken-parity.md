# GitKraken 对标改造实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Git 客户端 UI/UX、核心功能、设置面板对标 GitKraken 免费版水平

**Architecture:** 分层渐进式 — Phase 1 先统一 GitKraken 风格视觉基准并补全 Undo/Discard/Cherry-Pick/GPG，Phase 2 补全 Diff/冲突/Rebase 核心功能，Phase 3 完善设置

**Tech Stack:** Vue 3 + Naive UI + UnoCSS + Tauri 2 + Rust/git2

**Spec:** `docs/superpowers/specs/2026-05-19-gitkraken-parity-design.md`

---

## 现有基础设施

已有 Rust 后端命令（无需新建）：
- `cherry_pick` — commands/merge.rs
- `revert_commit` — commands/merge.rs
- `reset_commit` — commands/reset.rs
- `get_diff` / `get_working_diff` / `get_staged_diff` / `get_file_content` — commands/diff.rs
- `resolve_conflict` / `stage_files` / `unstage_files` — commands/diff.rs
- `get_git_config` / `set_git_config` — commands/settings.rs
- `list_hooks` / `get_hook_content` / `set_hook_content` — commands/hook.rs
- `rebase_branch` — commands/branch.rs（基础版，非交互式）

---

## Phase 1 — UI/UX 统一 + Undo/Discard + Cherry-Pick + GPG 签名

### Task 1: CSS 变量迁移到 GitKraken Dark 色系

**Files:**
- Modify: `git-client/src/assets/styles/variables.css`

- [ ] **Step 1: 更新 dark 主题 CSS 变量**

将 `.dark {} 块中的变量值替换为 GitKraken Dark 色系：

```css
.dark {
  --background: #0d1117;
  --foreground: #c9d1d9;
  --card: #161b22;
  --card-foreground: #c9d1d9;
  --popover: #161b22;
  --popover-foreground: #c9d1d9;
  --primary: #58a6ff;
  --primary-foreground: #ffffff;
  --secondary: #30363d;
  --secondary-foreground: #c9d1d9;
  --muted: #161b22;
  --muted-foreground: #8b949e;
  --accent: #1f6feb;
  --accent-foreground: #c9d1d9;
  --destructive: #f85149;
  --destructive-foreground: #ffffff;
  --border: #30363d;
  --input: #30363d;
  --ring: #58a6ff;
  --chart-1: #58a6ff;
  --chart-2: #3fb950;
  --chart-3: #e3b341;
  --chart-4: #bc8cff;
  --chart-5: #f85149;
  --sidebar: #161b22;
  --sidebar-foreground: #c9d1d9;
  --sidebar-primary: #58a6ff;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: rgba(255, 255, 255, 0.08);
  --sidebar-accent-foreground: #c9d1d9;
  --sidebar-border: #30363d;
  --sidebar-ring: #58a6ff;
}
```

- [ ] **Step 2: 更新 light 主题 CSS 变量**

将 `:root {} 块中的变量值替换为 GitKraken Light 色系：

```css
:root {
  --background: #ffffff;
  --foreground: #1f2328;
  --card: #ffffff;
  --card-foreground: #1f2328;
  --popover: #ffffff;
  --popover-foreground: #1f2328;
  --primary: #0969da;
  --primary-foreground: #ffffff;
  --secondary: #eaeef2;
  --secondary-foreground: #1f2328;
  --muted: #f6f8fa;
  --muted-foreground: #656d76;
  --accent: #ddf4ff;
  --accent-foreground: #1f2328;
  --destructive: #cf222e;
  --destructive-foreground: #ffffff;
  --border: #d0d7de;
  --input: #d0d7de;
  --ring: #0969da;
  --chart-1: #0969da;
  --chart-2: #1a7f37;
  --chart-3: #9a6700;
  --chart-4: #8250df;
  --chart-5: #cf222e;
  --sidebar: #f6f8fa;
  --sidebar-foreground: #1f2328;
  --sidebar-primary: #0969da;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: rgba(0, 0, 0, 0.04);
  --sidebar-accent-foreground: #1f2328;
  --sidebar-border: #d0d7de;
  --sidebar-ring: #0969da;
}
```

保留 `@theme inline` 和 `@layer base` 块不变。

- [ ] **Step 3: 运行 dev 验证视觉**

Run: `cd git-client; npm run dev:git-client`
Expected: 应用启动，dark 主题为深蓝黑色调，primary 色为 #58a6ff

- [ ] **Step 4: Commit**

```bash
git add git-client/src/assets/styles/variables.css
git commit -m "feat: migrate CSS variables to GitKraken color scheme"
```

---

### Task 2: 硬编码颜色替换

**Files:**
- Modify: `git-client/src/components/layout/Sidebar.vue`
- Modify: `git-client/src/components/settings/SshKeyItem.vue`
- Modify: `git-client/src/components/settings/GpgKeyItem.vue`
- Modify: `git-client/src/components/conflict/ConflictResolver.vue`
- Other files with hardcoded gray-* classes

- [ ] **Step 1: 扫描硬编码颜色**

Run: `cd git-client; grep -rn "gray-[0-9]" src/components/ --include="*.vue" | head -30`
记录所有使用 `border-gray-700`、`text-gray-400`、`bg-gray-800` 等硬编码颜色的位置。

- [ ] **Step 2: 替换 Sidebar.vue 硬编码颜色**

将所有 `border-gray-700` → `border-border`
将所有 `hover:bg-gray-800/50` → `hover:bg-sidebar-accent`
将所有 `text-gray-400` → `text-muted-foreground`
将所有 `text-gray-500` → `text-muted-foreground`

- [ ] **Step 3: 替换 SshKeyItem.vue 和 GpgKeyItem.vue 硬编码颜色**

同上规则替换。

- [ ] **Step 4: 替换 ConflictResolver.vue 硬编码颜色**

将 `border-gray-700` → `border-border`
将 `text-yellow-400` → `text-accent-yellow`（需在 @theme 中添加映射）
将 `text-green-400` / `text-red-400` → `text-accent-green` / `text-destructive`

- [ ] **Step 5: 添加 accent 颜色语义映射到 variables.css**

在 `@theme inline` 块中添加：

```css
  --color-accent-green: #3fb950;
  --color-accent-yellow: #e3b341;
  --color-accent-purple: #bc8cff;
  --color-accent-red: #f85149;
```

dark 主题中已有映射。light 主题使用对应浅色版本。

- [ ] **Step 6: 验证并 Commit**

Run: `cd git-client; npm run dev:git-client`
验证所有组件颜色一致，无硬编码灰色残留。

```bash
git add -A git-client/src/
git commit -m "refactor: replace hardcoded colors with CSS variables"
```

---

### Task 3: Sidebar 视觉打磨

**Files:**
- Modify: `git-client/src/components/layout/Sidebar.vue`

- [ ] **Step 1: 增大 section header 行高**

在 `<style>` 块中：`.section-header { height: 28px }` → `height: 32px`
`.section-title { font-size: 11px }` → `font-size: 11px`（保持）

- [ ] **Step 2: 当前分支高亮样式增强**

`.ref-name-current` 添加 `font-weight: 700`
`.dot-current` 添加 `box-shadow: 0 0 0 2px var(--sidebar-primary)`

- [ ] **Step 3: 右键菜单添加图标**

在 `localMenuOptions` 等菜单定义中，为每个选项添加 icon 字段。使用 DropdownMenuItem 的 icon 插槽。示例：

```ts
const localMenuOptions = [
  { label: 'Checkout', key: 'checkout', icon: GitBranch },
  { label: 'Merge', key: 'merge', icon: GitMerge },
  { label: 'Rebase', key: 'rebase', icon: ReturnDownBack },
  { label: 'Delete', key: 'delete', icon: TrashOutline },
  { label: 'Rename', key: 'rename', icon: CreateOutline },
]
```

在 DropdownMenuItem 模板中渲染图标。

- [ ] **Step 4: 添加分支搜索过滤框**

在 `sidebar-scroll` 顶部添加搜索输入框：

```html
<div class="sidebar-search">
  <input v-model="searchQuery" placeholder="Filter branches..." class="search-input" />
</div>
```

用 `searchQuery` 过滤 `localBranches` 和 `remoteBranches`。

- [ ] **Step 5: 验证并 Commit**

```bash
git add git-client/src/components/layout/Sidebar.vue
git commit -m "feat: polish Sidebar with GitKraken style, search filter, and menu icons"
```

---

### Task 4: TabActionBar 视觉打磨 + 移除 Toolbar

**Files:**
- Modify: `git-client/src/components/layout/TabActionBar.vue`
- Delete: `git-client/src/components/layout/Toolbar.vue`
- Modify: `git-client/src/components/layout/AppLayout.vue`

- [ ] **Step 1: Repo/分支 Chip 样式**

将 repo-switch-btn 和 branch-switch-btn 改为 Chip 样式：圆角 + 边框 + 深色背景。

```css
.repo-switch-btn, .branch-switch-btn {
  border: 1px solid var(--border) !important;
  border-radius: 6px !important;
  background: var(--muted) !important;
}
```

- [ ] **Step 2: Fetch/Pull/Push 添加 tooltip**

为每个操作按钮添加 `title` 属性或 Tooltip 组件。

- [ ] **Step 3: 移除 Toolbar.vue**

从 AppLayout.vue 中移除 Toolbar 的 import 和使用。检查是否有 Toolbar 的独特功能未在 TabActionBar 中覆盖（当前两个组件功能重叠）。

- [ ] **Step 4: 验证并 Commit**

```bash
git rm git-client/src/components/layout/Toolbar.vue
git add git-client/src/components/layout/
git commit -m "refactor: polish TabActionBar, remove duplicate Toolbar"
```

---

### Task 5: CommitGraph 视觉打磨

**Files:**
- Modify: `git-client/src/components/graph/CommitGraph.vue`

- [ ] **Step 1: 分支线颜色循环**

在 `graphRenderer.ts` 中修改颜色数组：

```ts
const BRANCH_COLORS = ['#bc8cff', '#3fb950', '#58a6ff', '#e3b341', '#f85149', '#79c0ff']
```

- [ ] **Step 2: 选中行改为左侧色条**

替换 `.row-selected` 样式：

```css
.row-selected {
  box-shadow: inset 3px 0 0 var(--primary);
  background: rgba(88, 166, 255, 0.08);
}
```

移除旧的 `background: rgba(14, 99, 156, 0.3)` 样式。

- [ ] **Step 3: WIP 行虚线边框**

修改 `.wip-row` 样式：

```css
.wip-row {
  border-top: 1px dashed var(--border);
  border-bottom: 1px dashed var(--border);
}
```

- [ ] **Step 4: ref tag 胶囊样式统一**

更新 `.ref-main` → 绿色 `#3fb950`，`.ref-branch` → 蓝色 `#58a6ff`，`.ref-remote` → 紫色 `#bc8cff`，`.ref-tag` → 黄色 `#e3b341`

- [ ] **Step 5: 验证并 Commit**

```bash
git add git-client/src/components/graph/
git commit -m "feat: polish CommitGraph with GitKraken branch colors and selection style"
```

---

### Task 6: StagingPanel + CommitDetails + StatusBar + RepoTabs + RightPanel 打磨

**Files:**
- Modify: `git-client/src/components/staging/UnstagedFilesSection.vue`
- Modify: `git-client/src/components/staging/StagedFilesSection.vue`
- Modify: `git-client/src/components/staging/StagingPanel.vue`
- Modify: `git-client/src/components/commit/CommitDetails.vue`
- Modify: `git-client/src/components/layout/StatusBar.vue`
- Modify: `git-client/src/components/layout/RepoTabs.vue`
- Modify: `git-client/src/components/layout/RightPanel.vue`

- [ ] **Step 1: StagingPanel 文件状态图标**

在 UnstagedFilesSection 和 StagedFilesSection 中，为每个文件项添加变更类型图标：
- Modified: 🟡 M 标签
- Added: 🟢 A 标签
- Deleted: 🔴 D 标签
- Renamed: 🔵 R 标签

每个文件行添加操作按钮：discard（仅 unstaged）、stage/unstage。

- [ ] **Step 2: CommitDetails 头像和统计条**

作者行改为头像圆圈（首字母+颜色hash）+ 名字 + 时间。
SHA 行改为 Chip 样式（圆角、深色背景、等宽字体）。
文件列表添加差异统计条（+N -N）。

- [ ] **Step 3: StatusBar ahead/behind**

在 `status-ahead-behind` 区域绑定真实的 ahead/behind 数据（从 branches store 获取或新增 IPC 命令）。

- [ ] **Step 4: RepoTabs 圆角标签 + 关闭按钮**

选中 Tab 底部色条，未选中 Tab 无色条。
每个 Tab 添加 × 关闭按钮。

- [ ] **Step 5: RightPanel Tab 切换**

添加顶部 Tab 栏：Staging / Commit Detail 两个 Tab（Diff Tab 在 Phase 2a 添加）。
底部 CommitEditorSection 可折叠。

- [ ] **Step 6: 验证并 Commit**

```bash
git add git-client/src/components/
git commit -m "feat: polish StagingPanel, CommitDetails, StatusBar, RepoTabs, RightPanel"
```

---

### Task 7: Rust 后端 — Undo/Redo/Discard 命令

**Files:**
- Create: `git-client/src-tauri/src/commands/undo.rs`
- Modify: `git-client/src-tauri/src/commands/mod.rs`
- Modify: `git-client/src-tauri/src/lib.rs`

- [ ] **Step 1: 创建 undo.rs**

```rust
use crate::utils::error::AppError;
use crate::AppState;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::State;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReflogEntry {
    pub commit_id: String,
    pub message: String,
}

#[tauri::command]
pub async fn get_reflog(
    state: State<'_, AppState>,
    repo_path: String,
) -> Result<Vec<ReflogEntry>, AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        let mut reflog = repo.reflog()?;
        let mut entries = Vec::new();
        for entry in reflog.iter() {
            if let Some(oid) = entry.id_new().ok() {
                entries.push(ReflogEntry {
                    commit_id: oid.to_string(),
                    message: entry.message().unwrap_or("").to_string(),
                });
            }
            if entries.len() >= 50 { break; }
        }
        Ok(entries)
    })
    .await?
}

#[tauri::command]
pub async fn undo(
    state: State<'_, AppState>,
    repo_path: String,
) -> Result<(), AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        let mut reflog = repo.reflog()?;
        if reflog.len() < 2 {
            return Err(AppError::Credential("Nothing to undo".to_string()));
        }
        let prev_id = reflog.get(1)
            .ok_or(AppError::Credential("No previous reflog entry".to_string()))?
            .id_new()
            .map_err(|e| AppError::Credential(e.to_string()))?;
        let obj = repo.find_object(prev_id, None, true)?;
        repo.reset(&obj, git2::ResetType::Mixed, None)?;
        Ok(())
    })
    .await?
}

#[tauri::command]
pub async fn redo(
    state: State<'_, AppState>,
    repo_path: String,
    current_index: usize,
) -> Result<(), AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        let reflog = repo.reflog()?;
        let entry = reflog.get(current_index.saturating_sub(1))
            .ok_or(AppError::Credential("No redo entry".to_string()))?;
        let id = entry.id_new().map_err(|e| AppError::Credential(e.to_string()))?;
        let obj = repo.find_object(id, None, true)?;
        repo.reset(&obj, git2::ResetType::Mixed, None)?;
        Ok(())
    })
    .await?
}

#[tauri::command]
pub async fn discard_file(
    state: State<'_, AppState>,
    repo_path: String,
    file_path: String,
) -> Result<(), AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        let mut checkout_opts = git2::CheckoutBuilder::new();
        checkout_opts.path(file_path.as_str());
        checkout_opts.force();
        repo.checkout_head(Some(&mut checkout_opts))?;
        Ok(())
    })
    .await?
}

#[tauri::command]
pub async fn discard_all(
    state: State<'_, AppState>,
    repo_path: String,
) -> Result<(), AppError> {
    let repos = state.repos.clone();
    tokio::task::spawn_blocking(move || {
        let manager = repos.lock().map_err(|e| AppError::Credential(e.to_string()))?;
        let repo = manager.get_repo(&repo_path)?;
        let mut checkout_opts = git2::CheckoutBuilder::new();
        checkout_opts.force();
        repo.checkout_head(Some(&mut checkout_opts))?;
        Ok(())
    })
    .await?
}
```

- [ ] **Step 2: 注册新模块和命令**

在 `commands/mod.rs` 添加 `pub mod undo;`

在 `lib.rs` 的 `invoke_handler` 中添加：

```rust
commands::undo::get_reflog,
commands::undo::undo,
commands::undo::redo,
commands::undo::discard_file,
commands::undo::discard_all,
```

- [ ] **Step 3: 编译验证**

Run: `cd git-client/src-tauri; cargo build`
Expected: 编译成功

- [ ] **Step 4: Commit**

```bash
git add git-client/src-tauri/src/
git commit -m "feat: add undo/redo/discard Rust commands"
```

---

### Task 8: 前端 — Undo/Redo UI 接入

**Files:**
- Create: `git-client/src/stores/undo.ts`
- Modify: `git-client/src/components/layout/TabActionBar.vue`
- Modify: `git-client/src/composables/useKeyboard.ts`

- [ ] **Step 1: 创建 undo store**

`stores/undo.ts`：管理 reflog 索引，提供 undo/redo action，调用 Rust 后端命令。

- [ ] **Step 2: TabActionBar Undo/Redo 按钮接入**

将 disabled Undo/Redo 按钮连接到 undo store。有 reflog 可回退时启用 Undo，有前进记录时启用 Redo。

已推送操作的 undo 前弹出确认对话框。

- [ ] **Step 3: 快捷键绑定**

在 useKeyboard.ts 中添加 Ctrl+Z → undo、Ctrl+Shift+Z → redo。

- [ ] **Step 4: 验证并 Commit**

```bash
git add git-client/src/
git commit -m "feat: wire up Undo/Redo UI with reflog backend"
```

---

### Task 9: 前端 — Discard UI 接入

**Files:**
- Modify: `git-client/src/components/staging/StagingPanel.vue`
- Modify: `git-client/src/components/staging/UnstagedFilesSection.vue`

- [ ] **Step 1: 替换 discard toast 为真实功能**

在 StagingPanel 中将 `handleDiscard` 和 `handleDiscardAll` 改为调用 `invoke('discard_file', ...)` 和 `invoke('discard_all', ...)`。

添加确认对话框：

```ts
async function handleDiscard(path: string) {
  const confirmed = await showConfirmDialog(`确定丢弃 ${path} 的更改？`)
  if (!confirmed) return
  await invoke('discard_file', { repoPath, filePath: path })
  await refreshStaging()
}
```

- [ ] **Step 2: UnstagedFilesSection 添加 discard 按钮**

每个文件行添加 × discard 按钮，触发 `@discard` 事件。

- [ ] **Step 3: 添加 Discard All 按钮**

在 UnstagedFilesSection 头部添加 "Discard All" 按钮。

- [ ] **Step 4: 验证并 Commit**

```bash
git add git-client/src/components/staging/
git commit -m "feat: implement Discard file changes with confirmation dialog"
```

---

### Task 10: 前端 — Cherry-Pick 右键菜单接入

**Files:**
- Modify: `git-client/src/components/graph/CommitGraph.vue`
- Modify: `git-client/src/components/commit/CommitDetails.vue`

- [ ] **Step 1: CommitGraph 添加右键 Cherry-Pick**

在 CommitGraph 的 context-menu 事件处理中，弹出菜单包含 Cherry-Pick 选项。点击后调用 `invoke('cherry_pick', { repoPath, commitId })`。

- [ ] **Step 2: CommitDetails 添加 Cherry-Pick 按钮**

在 SHA 行附近添加 Cherry-Pick 操作按钮。

- [ ] **Step 3: 验证并 Commit**

```bash
git add git-client/src/components/
git commit -m "feat: add Cherry-Pick to commit context menu"
```

---

### Task 11: 前端 — GPG 签名提交

**Files:**
- Modify: `git-client/src-tauri/src/commands/commit.rs`（添加 gpg_sign 参数）
- Modify: `git-client/src/components/staging/CommitEditorSection.vue`

- [ ] **Step 1: Rust commit 命令添加 gpg_sign 参数**

在 commit 命令中添加 `gpg_sign: Option<bool>` 参数。当 `gpg_sign == Some(true)` 时，设置 `commit_builder.gpg_sign(true)`。

- [ ] **Step 2: CommitEditorSection 添加签名开关**

在 Amend 复选框旁添加 GPG 签名开关 🔑。开启时传递 `gpgSign: true` 给 commit 命令。

- [ ] **Step 3: 验证并 Commit**

```bash
git add git-client/src-tauri/src/commands/commit.rs git-client/src/components/staging/
git commit -m "feat: add GPG signing toggle to commit editor"
```

---

### Task 12: 交互反馈 — 加载状态 + 微交互 + 空状态

**Files:**
- Modify: `git-client/src/components/layout/TabActionBar.vue`
- Modify: `git-client/src/components/layout/Sidebar.vue`
- Modify: `git-client/src/components/layout/RightPanel.vue`
- Create: `git-client/src/components/common/EmptyState.vue`
- Create: `git-client/src/components/common/LoadingSpinner.vue`

- [ ] **Step 1: Fetch/Pull/Push 按钮 spinner**

TabActionBar 中，当 `isSyncing` 为 true 时，Fetch/Pull/Push 按钮内显示旋转 spinner 图标替代文字。

- [ ] **Step 2: Sidebar loading dots**

Sidebar 加载时在 section 标题旁显示动画 dots。

- [ ] **Step 3: Toast slide-in 动画**

确认 sonner 组件有 slide-in 配置。如无，添加 CSS 动画。

- [ ] **Step 4: 空状态组件**

创建 EmptyState.vue 通用组件：图标 + 标题 + 操作按钮。在无仓库、无 commit 等场景使用。

- [ ] **Step 5: 验证并 Commit**

```bash
git add git-client/src/components/
git commit -m "feat: add loading states, micro-interactions, and empty states"
```

---

## Phase 2a — Monaco Diff 视图

### Task 13: 安装 Monaco Editor 依赖

- [ ] **Step 1: 安装包**

Run: `cd git-client; npm install monaco-editor @monaco-editor/loader`

- [ ] **Step 2: 验证**

Run: `npm run dev:git-client`
Expected: 应用正常启动

- [ ] **Step 3: Commit**

```bash
git add git-client/package.json git-client/package-lock.json
git commit -m "chore: add Monaco Editor dependency"
```

---

### Task 14: Diff Rust 后端扩展

**Files:**
- Modify: `git-client/src-tauri/src/services/diff_service.rs`
- Modify: `git-client/src-tauri/src/models/diff.rs`

- [ ] **Step 1: 扩展 FileDiff 模型添加 hunks**

添加 hunk 数据结构：行号范围 + 内容行。确保 `get_diff`/`get_working_diff`/`get_staged_diff` 返回完整 hunks。

- [ ] **Step 2: 添加 `diff_between_commits` 命令**

新增接受两个 commit_id 参数的 diff 命令。

- [ ] **Step 3: 添加 `get_file_diff_content` 命令**

返回单个文件在两个版本间的完整内容（用于 Monaco diff）。

- [ ] **Step 4: 编译验证**

Run: `cd git-client/src-tauri; cargo build`

- [ ] **Step 5: Commit**

```bash
git add git-client/src-tauri/src/
git commit -m "feat: extend diff backend with hunks and file content commands"
```

---

### Task 15: DiffViewer 组件

**Files:**
- Create: `git-client/src/components/diff/DiffViewer.vue`
- Create: `git-client/src/components/diff/FileDiffPanel.vue`
- Create: `git-client/src/components/diff/DiffStatsBar.vue`
- Create: `git-client/src/components/diff/InlineDiffView.vue`
- Create: `git-client/src/components/diff/index.ts`

- [ ] **Step 1: 创建 DiffViewer.vue**

使用 Monaco Editor 的 `DiffEditor` 组件，封装 side-by-side 和 inline 两种模式切换。

- [ ] **Step 2: 创建 FileDiffPanel.vue**

左侧文件列表（含状态图标 M/A/D/R），右侧 DiffViewer。切换文件时加载对应 diff。

- [ ] **Step 3: 创建 DiffStatsBar.vue**

显示 `+N -N` 的统计条，绿色+红色。

- [ ] **Step 4: 创建 InlineDiffView.vue**

轻量级内联 diff 视图，不依赖 Monaco，使用纯 HTML 渲染。适合小文件和快速预览。

- [ ] **Step 5: 创建 index.ts 导出**

- [ ] **Step 6: 接入 RightPanel**

在 RightPanel 的 Tab 切换中添加 Diff Tab。选择 CommitDetail 中的文件时自动切换到 Diff Tab。

- [ ] **Step 7: 验证并 Commit**

```bash
git add git-client/src/components/diff/ git-client/src/components/layout/RightPanel.vue
git commit -m "feat: implement Monaco Diff viewer with side-by-side and inline modes"
```

---

## Phase 2b — 冲突解决（2-way MVP）

### Task 16: 冲突解决 Rust 后端

**Files:**
- Modify: `git-client/src-tauri/src/services/merge_service.rs`

- [ ] **Step 1: 添加 `get_merge_conflicts` 命令**

返回冲突文件列表，每个文件包含 ours/theirs 内容。

- [ ] **Step 2: 添加 `mark_resolved` 命令**

标记单个文件为已解决，写入合并结果。

- [ ] **Step 3: 添加 `complete_merge` 命令**

所有冲突解决后，完成合并提交。

- [ ] **Step 4: 编译验证**

Run: `cd git-client/src-tauri; cargo build`

- [ ] **Step 5: Commit**

```bash
git add git-client/src-tauri/src/
git commit -m "feat: add merge conflict resolution backend commands"
```

---

### Task 17: 冲突解决前端组件

**Files:**
- Rewrite: `git-client/src/components/conflict/ConflictResolver.vue`
- Rewrite: `git-client/src/components/conflict/ThreeWayDiff.vue`

- [ ] **Step 1: 重写 ConflictResolver.vue**

上方 Ours vs Theirs 双栏 diff（复用 DiffViewer 的 inline 模式），冲突区域高亮。每个 hunk 有 Use Ours / Use Theirs 按钮。底部可编辑合并结果。"Mark as Resolved" 按钮。

- [ ] **Step 2: 重写 ThreeWayDiff.vue**

2-way diff 展示组件，接收 ours/theirs 内容，展示冲突区域。

- [ ] **Step 3: 接入 AppLayout**

当 merge 冲突发生时，RightPanel 自动切换到冲突解决视图。

- [ ] **Step 4: 验证并 Commit**

```bash
git add git-client/src/components/conflict/
git commit -m "feat: implement 2-way merge conflict resolver"
```

---

## Phase 2c — 交互式 Rebase（列表式 MVP）

### Task 18: Rebase Rust 后端

**Files:**
- Modify: `git-client/src-tauri/src/commands/branch.rs`
- Modify: `git-client/src-tauri/src/services/branch_service.rs`

- [ ] **Step 1: 添加 `rebase_interactive` 命令**

接受 commit 列表和操作类型（pick/squash/reword/drop/edit），执行交互式 rebase。

- [ ] **Step 2: 添加 `rebase_continue` 和 `rebase_abort`**

- [ ] **Step 3: 编译验证**

- [ ] **Step 4: Commit**

```bash
git add git-client/src-tauri/src/
git commit -m "feat: add interactive rebase backend commands"
```

---

### Task 19: Rebase 前端组件

**Files:**
- Rewrite: `git-client/src/components/rebase/RebaseDialog.vue`
- Create: `git-client/src/components/rebase/RebaseCommitList.vue`

- [ ] **Step 1: 创建 RebaseCommitList.vue**

列表展示待 rebase 的 commit，每行有：上下箭头（调整顺序）、操作标签（pick/squash/reword/drop/edit 切换按钮）、commit 信息。

- [ ] **Step 2: 重写 RebaseDialog.vue**

使用 RebaseCommitList 组件。底部有 Start Rebase / Cancel 按钮。reword 时弹出 commit message 编辑框。

- [ ] **Step 3: 接入 Sidebar 右键菜单**

将 Sidebar 中 "Rebase" 右键菜单项连接到 RebaseDialog。

- [ ] **Step 4: 验证并 Commit**

```bash
git add git-client/src/components/rebase/
git commit -m "feat: implement list-based interactive rebase UI"
```

---

## Phase 3a — 设置面板重构 + Git Config + 通用增强

### Task 20: 设置面板侧栏导航重构

**Files:**
- Rewrite: `git-client/src/components/settings/SettingsPanel.vue`

- [ ] **Step 1: 重写 SettingsPanel.vue**

左侧导航列表：通用 / Git 配置 / SSH 密钥 / GPG 密钥（4 项先实现）。
右侧内容区根据 activeTab 切换。
宽度 700px。

- [ ] **Step 2: 验证**

确认 SSH/GPG 密钥管理页面仍正常工作。

- [ ] **Step 3: Commit**

```bash
git add git-client/src/components/settings/
git commit -m "feat: redesign SettingsPanel with sidebar navigation"
```

---

### Task 21: Git 配置设置页

**Files:**
- Create: `git-client/src/components/settings/GitConfigSection.vue`
- Modify: `git-client/src/components/settings/SettingsPanel.vue`

- [ ] **Step 1: 创建 GitConfigSection.vue**

表单包含：user.name、user.email（带全局/仓库切换）、defaultBranch、autocrlf、pull.rebase。
调用 `get_git_config` / `set_git_config`。

- [ ] **Step 2: 接入 SettingsPanel**

添加 "Git 配置" 导航项，渲染 GitConfigSection。

- [ ] **Step 3: 验证并 Commit**

```bash
git add git-client/src/components/settings/
git commit -m "feat: add Git Config settings page"
```

---

### Task 22: 通用设置增强

**Files:**
- Modify: `git-client/src/components/settings/SettingsPanel.vue`
- Modify: `git-client/src-tauri/src/commands/settings.rs`
- Modify: `git-client/src-tauri/src/models/` (AppSettings 结构体)

- [ ] **Step 1: AppSettings 添加新字段**

在 Rust AppSettings 中添加：startup_action、confirm_force_push、confirm_discard、confirm_reset、notifications_enabled、auto_fetch_interval。

- [ ] **Step 2: 通用设置页增强**

添加主题 System 选项、启动时行为下拉、确认操作开关组、通知开关、自动 fetch 间隔。

- [ ] **Step 3: 验证并 Commit**

```bash
git add git-client/src/components/settings/ git-client/src-tauri/src/
git commit -m "feat: enhance general settings with System theme, confirmations, auto-fetch"
```

---

## Phase 3b — Proxy + Editor + Shortcuts + Hooks

### Task 23: 代理设置页

**Files:**
- Create: `git-client/src/components/settings/ProxySection.vue`

- [ ] **Step 1: 创建 ProxySection.vue**

HTTP/HTTPS/SOCKS5 代理输入框 + No Proxy + 认证字段。写入 git config `http.proxy` / `https.proxy`。

- [ ] **Step 2: 接入 SettingsPanel**

- [ ] **Step 3: Commit**

```bash
git add git-client/src/components/settings/
git commit -m "feat: add Proxy settings page"
```

---

### Task 24: 编辑器配置页

**Files:**
- Create: `git-client/src/components/settings/EditorSection.vue`

- [ ] **Step 1: 创建 EditorSection.vue**

默认编辑器/Diff 工具/合并工具下拉 + 字号/Tab 大小。写入 git config `core.editor` / `diff.tool` / `merge.tool`。

- [ ] **Step 2: 接入 SettingsPanel**

- [ ] **Step 3: Commit**

```bash
git add git-client/src/components/settings/
git commit -m "feat: add Editor settings page"
```

---

### Task 25: 快捷键配置页

**Files:**
- Create: `git-client/src/components/settings/ShortcutsSection.vue`
- Modify: `git-client/src/composables/useKeyboard.ts`

- [ ] **Step 1: 创建 ShortcutsSection.vue**

分类列表展示快捷键。点击快捷键 → 按新组合键 → 保存。每个可 Reset to Default。

- [ ] **Step 2: 接入 SettingsPanel**

- [ ] **Step 3: Commit**

```bash
git add git-client/src/components/settings/
git commit -m "feat: add keyboard shortcuts configuration page"
```

---

### Task 26: Git Hooks 设置页

**Files:**
- Create: `git-client/src/components/settings/HooksSection.vue`

- [ ] **Step 1: 创建 HooksSection.vue**

列表显示 hooks（调用已有 `list_hooks` 命令）。每个 hook：启用/禁用开关 + 编辑按钮。编辑弹出代码编辑器（调用 `get_hook_content` / `set_hook_content`）。

- [ ] **Step 2: 接入 SettingsPanel**

- [ ] **Step 3: Commit**

```bash
git add git-client/src/components/settings/
git commit -m "feat: add Git Hooks management settings page"
```

---

## 最终验证

### Task 27: 全量测试 + Lint

- [ ] **Step 1: 前端 Lint**

Run: `cd git-client; npm run lint`

- [ ] **Step 2: Rust Clippy**

Run: `cd git-client/src-tauri; cargo clippy`

- [ ] **Step 3: 前端单元测试**

Run: `cd git-client; npm run test:git-client`

- [ ] **Step 4: Rust 单元测试**

Run: `cd git-client/src-tauri; cargo test`

- [ ] **Step 5: 修复所有 Lint/Test 错误**

- [ ] **Step 6: 最终 Commit**

```bash
git commit -m "chore: fix lint and test issues after GitKraken parity implementation"
```
