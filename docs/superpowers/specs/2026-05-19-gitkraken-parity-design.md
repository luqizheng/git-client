# GitKraken 对标改造设计文档

> 日期: 2026-05-19
> 方案: A — 分层渐进式（修订版，含 CEO Review 修订）
> 控制台/终端暂不实现

---

## 背景

对标 GitKraken 免费版，当前项目核心 Git 功能基本可用但存在关键缺失，UI/UX 未达到 GitKraken 的专业质感。本设计覆盖三大改造方向：视觉统一、功能补全、设置完善。

### CEO Review 修订记录

| ID | 修订内容 | 优先级 |
|---|---|---|
| R1 | Phase 1 合并 Undo/Discard + Cherry-Pick + GPG 签名，确保有功能增量 | 必须 |
| R2 | Rebase MVP 降级为列表式（箭头排序，无拖拽），拖拽作为增强迭代 | 必须 |
| R3 | 冲突解决 MVP 降级为 2-way diff + 手动编辑区，三方视图作为增强迭代 | 必须 |
| W1 | Undo 增加已推送操作强制确认规则 | 建议 |
| W2 | Phase 3 拆分为 3a/3b，3a 先交付 Git Config + 通用增强 | 建议 |
| W3 | Phase 1 增加硬编码颜色扫描和替换 | 建议 |

---

## Phase 1 — UI/UX 统一 + Undo/Discard + Cherry-Pick + GPG 签名

### 1.1 CSS 变量重建

将当前 Catppuccin Mocha 色系迁移至 GitKraken Dark 色系，仅修改 `assets/styles/` 主题文件，不改组件逻辑。

| 变量 | 当前值 | 目标值 |
|---|---|---|
| --primary | #89b4fa | #58a6ff |
| --foreground | #cdd6f4 | #c9d1d9 |
| --muted | #6c7086 | #8b949e |
| --muted-foreground | #a6adc8 | #8b949e |
| --background | #1e1e2e | #0d1117 |
| --sidebar | #181825 | #161b22 |
| --sidebar-border | #313244 | #30363d |
| --sidebar-foreground | #cdd6f4 | #c9d1d9 |
| --sidebar-accent | rgba(255,255,255,0.06) | rgba(255,255,255,0.08) |
| --sidebar-primary | #89b4fa | #58a6ff |
| --border | #313244 | #30363d |
| --destructive | #f38ba8 | #f85149 |
| --accent-green | #a6e3a1 | #3fb950 |
| --accent-purple | #cba6f7 | #bc8cff |
| --accent-yellow | #f9e2af | #e3b341 |
| --accent-blue | #89b4fa | #58a6ff |
| --chart-1..4 | (Catppuccin) | #58a6ff / #3fb950 / #e3b341 / #bc8cff |

Light 主题同步更新为 GitKraken Light 对应色系。

### 1.2 硬编码颜色扫描和替换（W3）

扫描所有 .vue 文件中的硬编码颜色值（如 `border-gray-700`、`hover:bg-gray-800/50`、`text-gray-400`），替换为 CSS 变量或 UnoCSS 语义 token。

### 1.3 核心组件视觉打磨（8 个组件）

#### Sidebar
- section header 行高 28px → 32px
- 当前分支：实心圆 + 粗体 + 高亮色
- remote 分组：缩进连线替代纯文字
- 新增分支搜索过滤框
- 右键菜单添加图标

#### TabActionBar
- 统一按钮尺寸和间距
- Repo 名+分支用 Chip 样式（圆角 + 边框）
- Fetch/Pull/Push 图标+文字
- 移除重复的 Toolbar.vue（与 TabActionBar 功能重叠）
- 添加 hover tooltip

#### CommitGraph
- 分支线颜色按 GitKraken 配色（紫/绿/蓝/橙循环）
- merge commit 双圆圈（外空内实）
- ref tag 胶囊样式统一：分支蓝、tag 黄、remote 紫
- 选中行：左侧 3px 色条（非整行背景色）
- WIP 行虚线边框和图标

#### CommitDetails
- 作者信息：头像圆圈 + 名字 + 时间一行
- SHA：可点击 Chip 样式
- 文件列表：状态图标（M/A/D/R）+ 色彩
- 添加差异统计条（+12 -3）

#### StagingPanel
- 文件项添加状态图标（M🟡 A🟢 D🔴 R🔵）
- 每个 unstaged 文件加 discard 和 stage 按钮
- 每个 staged 文件加 unstage 按钮
- Commit 编辑器添加 GPG 签名开关
- Stage All / Unstage All 图标按钮

#### StatusBar
- ahead/behind 计数（从远程获取）
- 同步状态 spinner + 文字
- 缩放改为齿轮图标触发下拉

#### RepoTabs
- GitKraken 圆角标签样式
- 选中 Tab 底部色条指示
- 添加关闭按钮

#### RightPanel
- Tab 切换：Staging / Commit Detail / Diff
- 面板头部折叠/展开按钮
- 底部 Commit 编辑器可折叠

### 1.4 交互反馈完善

#### 加载状态
- Fetch/Pull/Push 期间按钮显示 spinner
- CommitGraph 首次加载显示骨架屏
- Sidebar 数据加载 loading dots

#### 微交互
- 按钮 hover 0.15s 过渡
- Sidebar section 展开/收起动画
- Toast slide-in 动画
- Tab 切换淡入

#### 空状态
- 无仓库：居中引导图 + Open/Clone 按钮
- 无 commit：空图表 + 初始提交提示
- 无分支：创建分支引导
- 搜索无结果：友好提示

#### 错误状态
- 操作失败显示详细错误 + 重试按钮
- 网络断开 StatusBar 离线指示
- 冲突时顶部警告条

### 1.5 Undo/Redo + Discard（R1 合并）

**Undo/Redo：**

- 基于 Git reflog 操作栈
- Undo = git reset 到 reflog 前一条
- Redo = 前进到 reflog 后一条
- 栈深度默认 50 条
- 快捷键 Ctrl+Z / Ctrl+Shift+Z
- 仅跟踪 commit/merge/rebase/reset 操作
- **已推送操作 undo 前强制确认**（W1）

**Discard：**

- 单个文件：`git checkout -- <file>`
- 全部未暂存：`git checkout -- .`
- 新增文件：`git clean -f`（需单独确认）
- 确认对话框："确定丢弃 X 个文件的更改？"
- 入口：右键菜单 → Discard This File；StagingPanel 顶部 → Discard All

**Rust 后端：** 新增 `undo`、`redo`、`discard_file`、`discard_all` 命令

### 1.6 Cherry-Pick（R1 合并）

- Commit 右键菜单 → Cherry-Pick
- 调用 `git cherry-pick <sha>`
- 冲突时跳转冲突解决面板（Phase 2b 后可用，此前 toast 提示）
- 支持多选 cherry-pick（Shift/Ctrl 多选）

**Rust 后端：** 新增 `cherry_pick` 命令

### 1.7 GPG 签名提交（R1 合并）

- CommitEditor 添加 S 图标开关
- 开启时 commit 加 `--gpg-sign`
- 设置中可配置默认签名 key
- 已有 GPG Key 管理基础

---

## Phase 2a — Monaco Diff 视图（2-way）

**前端组件：**

| 组件 | 职责 |
|---|---|
| diff/DiffViewer.vue | Monaco Editor diff 模式封装 |
| diff/FileDiffPanel.vue | 文件 diff 面板（含文件选择器） |
| diff/DiffStatsBar.vue | +N/-N 差异统计条 |
| diff/InlineDiffView.vue | 内联 diff（轻量模式） |
| diff/index.ts | 导出 |

**Rust 后端扩展（已有 diff_service.rs + commands/diff.rs）：**

| 命令 | 功能 |
|---|---|
| diff_commit | 两个 commit 间差异 |
| diff_working | 工作区 vs HEAD |
| diff_staged | 暂存区 vs HEAD |

返回结构：文件路径 + 变更类型 + hunks（行号范围 + 内容）

**Diff 视图布局模式：**

1. Side-by-Side（默认）：左侧旧文件，右侧新文件，行内高亮差异字符
2. Inline（切换）：单栏上下排列，适合窄屏
3. 文件树 + Diff：左侧变更文件列表，右侧 Diff 内容

---

## Phase 2b — 冲突解决（2-way + 手动编辑 MVP）（R3 修订）

**布局：** Ours vs Theirs 双栏 + 底部手动编辑区

**交互方式：**

1. 上方双栏 diff：左侧 Ours，右侧 Theirs，冲突区域高亮
2. 每个 hunk 有选择按钮：Use Ours / Use Theirs
3. 底部编辑区显示合并结果，可手动修改
4. "Mark as Resolved" → 下一个冲突文件
5. 全部解决后 "Complete Merge"

**Rust 后端：** 扩展 merge_service.rs，新增 `merge_get_conflicts`、`merge_resolve_file`、`merge_complete`

**前端组件：** 重写 ConflictResolver.vue 和 ThreeWayDiff.vue

---

## Phase 2c — 交互式 Rebase（列表式 MVP）（R2 修订）

**功能：**

- 列表展示待 rebase 的 commit
- 上下箭头按钮调整 commit 顺序（非拖拽）
- 操作标签切换：pick → squash → reword → drop → edit
- reword 模式弹出 commit message 编辑框
- rebase 过程遇冲突自动跳转冲突解决面板

**Rust 后端：** 新增 `rebase_interactive`、`rebase_continue`、`rebase_abort` 命令

**前端组件：** 重写 RebaseDialog.vue，新增 RebaseCommitList.vue

---

## Phase 3a — 设置面板重构 + Git Config + 通用增强（W2 拆分）

### 3a.0 设置面板重构

从弹窗 3-Tab 改为 GitKraken 风格侧栏导航：

- 左侧：垂直导航列表
- 右侧：对应设置内容区
- 宽度 600px → 700px
- 保留 Dialog 弹窗形式，改为侧栏导航布局

### 3a.1 Git 配置（直接抄 GitKraken）

| 配置项 | 类型 | 说明 |
|---|---|---|
| user.name | 输入框 | 全局/仓库级别切换 |
| user.email | 输入框 | 全局/仓库级别切换 |
| init.defaultBranch | 下拉 | main / master / custom |
| core.autocrlf | 下拉 | true / false / input |
| pull.rebase | 下拉 | true / false / interactive |
| credential.helper | 只读 | 显示当前值 |

Rust: `settings.rs` 已有 `get_git_config` / `set_git_config`

### 3a.2 通用设置增强

| 配置项 | 类型 | 说明 |
|---|---|---|
| 主题 | 下拉 | Dark / Light / System（新增） |
| 语言 | 下拉 | 中文 / English |
| 启动时 | 下拉 | 打开上次仓库 / 显示欢迎页 |
| 确认操作 | 开关组 | 强制推送/discard/重置前确认 |
| 通知 | 开关 | 操作完成通知 |
| 自动 fetch | 数字 | 间隔分钟数（0=关闭） |

---

## Phase 3b — Proxy + Editor + Shortcuts + Hooks（W2 拆分）

### 3b.1 代理设置

| 配置项 | 类型 | 说明 |
|---|---|---|
| HTTP Proxy | 输入框 | http://host:port |
| HTTPS Proxy | 输入框 | https://host:port |
| No Proxy | 输入框 | 排除列表 |
| SOCKS5 Proxy | 输入框 | socks5://host:port |
| 认证 | 用户名/密码 | keyring 存储 |

Rust: 写入 git config `http.proxy` / `https.proxy`

### 3b.2 编辑器配置

| 配置项 | 类型 | 说明 |
|---|---|---|
| 默认编辑器 | 下拉 | VS Code / Vim / Nano / 自定义 |
| Diff 工具 | 下拉 | 内置 / VS Code / Beyond Compare / 自定义 |
| 合并工具 | 下拉 | 内置 / VS Code / 自定义 |
| 编辑器字号 | 数字 | 12-24 |
| Tab 大小 | 下拉 | 2 / 4 / 8 |

Rust: `core.editor` / `diff.tool` / `merge.tool`

### 3b.3 快捷键配置

分类列表：
- 通用：Ctrl+Z Undo, Ctrl+Shift+Z Redo, Ctrl+S Save
- 仓库：Ctrl+Shift+O Open, Ctrl+Shift+N Clone
- Git：Ctrl+Enter Commit, Ctrl+P Push, Ctrl+F Fetch
- 导航：Ctrl+G Focus Graph, Ctrl+E Focus Editor

自定义方式：点击快捷键 → 按新组合键 → 保存
每个可 Reset to Default

### 3b.4 Git Hooks 管理

- 列表显示 pre-commit, commit-msg, pre-push 等
- 每个 hook：启用/禁用开关 + 编辑按钮
- 编辑器：打开 .git/hooks/ 文件编辑
- 新建：从模板创建 hook 脚本

---

## 增强迭代（后续版本）

- 三方冲突解决（Ours | Base | Theirs 三栏）
- 拖拽式交互 Rebase
- Command Palette（Ctrl+Shift+P）
- File History 文件历史
- .gitignore 可视化编辑
- Git LFS 支持
- 拖拽式 Push/Pull
- 云端集成（GitHub/GitLab OAuth）
- Pull Request 管理

---

## 依赖关系

```
Phase 1 (UI + Undo/Discard + Cherry-Pick + GPG)
    │
    ↓
Phase 2a (Diff 2-way) → Phase 2b (冲突 2-way) → Phase 2c (Rebase 列表式)
    │
    ↓
Phase 3a (设置重构 + Git Config + 通用增强) → Phase 3b (Proxy + Editor + Shortcuts + Hooks)
```

Phase 1 内部：1.1 CSS + 1.2 硬编码扫描 可先行，1.3-1.7 可并行。
Phase 2 严格按 2a → 2b → 2c 顺序。
Phase 3a 和 Phase 2c 可并行。

---

## 不包含的范围

- 内置终端/控制台
- AI 功能
- 云端集成（GitHub/GitLab OAuth）
- Pull Request 管理
- Git LFS
- 三方冲突解决（增强迭代）
- 拖拽式 Rebase（增强迭代）
- Command Palette（增强迭代）
- File History（增强迭代）
