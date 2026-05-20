# Agents

## Project Overview

对标 GitKraken 的免费 Git 桌面客户端，面向个人用户。

**核心目标：** 提供功能完整、界面精美、个人免费的 Git 图形化客户端。

## Tech Stack

| 层 | 技术 | 版本 | 用途 |
|---|---|---|---|
| 桌面框架 | Tauri | 2 | 轻量跨平台桌面壳 |
| 前端框架 | Vue 3 | ^3.5 | Composition API |
| 语言 (前端) | TypeScript | ^6.0 | 类型安全 |
| 语言 (后端) | Rust | 2021 edition | 高性能原生后端 |
| UI 库 | shadcn-vue | ^2.7 | Vue 3 组件库 |
| CSS 方案 | UnoCSS | ^66.6 | presetUno + presetAttributify |
| Tailwind CSS | Tailwind CSS | ^4.3 | 原子化 CSS 框架 |
| 图标库 | lucide-vue-next | ^1.0 | 现代图标库 |
| 状态管理 | Pinia | ^3.0 | Vue 官方状态管理 |
| 国际化 | vue-i18n | ^11.4 | 多语言支持 (中/英) |
| 代码编辑 | Monaco Editor | ^0.55 | 内嵌代码/diff 查看 |
| 虚拟列表 | @tanstack/vue-virtual | ^3.13 | 高性能虚拟滚动 |
| Git 核心 | git2 | 0.19 | libgit2 Rust 绑定 |
| 异步运行时 | Tokio | 1 (full) | Rust 异步 |
| 文件监听 | notify | 7 | 工作区变更监听 |
| 凭证管理 | keyring | 3 | 系统密钥链存储 |
| 错误处理 | thiserror | 2 | Rust 错误类型定义 |
| 日志 | tracing | 0.1 | 结构化日志 |
| 构建工具 | Vite | ^8.0 | 前端构建 |
| 测试 (前端) | Vitest | ^4.1 | 单元测试 |
| 测试 (后端) | cargo test | - | Rust 单元测试 |
| 工具库 | @vueuse/core | ^14.3 | Vue 组合式工具 |
| CI | GitHub Actions | - | Windows 构建 |

## Project Structure

```
./
├── AGENTS.md                     # 本文件
├── .agents/
│   └── skills/
│       ├── executing-plans/
│       ├── subagent-driven-development/
│       └── using-git-worktrees/
├── git-client/                   # Git 客户端主项目
│   ├── package.json              # 前端依赖与脚本
│   ├── vite.config.ts            # Vite + Tauri 构建配置
│   ├── vitest.config.ts          # 测试配置 (happy-dom)
│   ├── uno.config.ts             # UnoCSS 预设配置
│   ├── tsconfig.json             # TypeScript 配置
│   ├── components.json           # shadcn-vue 组件配置
│   ├── postcss.config.js         # PostCSS 配置
│   ├── .github/workflows/        # CI (GitHub Actions)
│   ├── docs/                     # 项目文档 (specs, plans)
│   ├── src/                      # Vue 前端源码
│   │   ├── assets/styles/        # 主题 (dark/light + CSS 变量)
│   │   ├── components/
│   │   │   ├── blame/            # BlamePanel
│   │   │   ├── branch/           # BranchDialog, BranchTree
│   │   │   ├── commit/           # CommitEditor, StageArea, CommitDetailPanel
│   │   │   │   ├── components/   # cells (Author/Date/Hash/Message/BranchTag),
│   │   │   │   │                 # commit-list
│   │   │   │   ├── composables/  # useColumnConfig, useCommitList,
│   │   │   │   │                 # useFilter, useInfiniteScroll
│   │   │   │   └── utils/        # commitHelpers, graphRenderer
│   │   │   ├── compare/          # BranchCompareDialog
│   │   │   ├── config/           # ConfigDialog
│   │   │   ├── conflict/         # ConflictResolver, ThreeWayDiff
│   │   │   ├── gitflow/          # GitFlowDialog
│   │   │   ├── graph/            # CommitGraph
│   │   │   ├── hook/             # HookDialog
│   │   │   ├── layout/           # AppLayout, AppContent, Sidebar, StatusBar,
│   │   │   │                     # RepoTabs, RightPanel, CenterArea,
│   │   │   │                     # TabActionBar, ResizeHandle
│   │   │   ├── rebase/           # RebaseDialog
│   │   │   ├── remote/           # RemotePanel, SshConfig
│   │   │   ├── repo/             # CloneDialog, RepoList, RepoPanel
│   │   │   ├── revert/           # RevertDialog
│   │   │   ├── search/           # AdvancedSearchDialog
│   │   │   ├── settings/         # SettingsPanel, SshKeyManager,
│   │   │   │                     # GpgKeyManager, SshKeyGenerator/Import/List
│   │   │   ├── staging/          # StagingPanel, StagedFilesSection,
│   │   │   │                     # UnstagedFilesSection, CommitEditorSection
│   │   │   ├── submodule/        # SubmoduleList
│   │   │   ├── tag/              # TagDialog, TagList
│   │   │   ├── ui/               # 基础 UI 组件库 (shadcn-vue 风格)
│   │   │   │                     # badge, button, checkbox, collapsible,
│   │   │   │                     # dialog, dropdown-menu, input, label,
│   │   │   │                     # menubar, resizable, select, separator,
│   │   │   │                     # sheet, sidebar, skeleton, sonner,
│   │   │   │                     # textarea, tooltip
│   │   │   └── worktree/         # WorktreeDialog, WorktreeList
│   │   ├── composables/          # useGit, useGitEvent, useI18n,
│   │   │                         # useKeyboard, useRemoteProgress,
│   │   │                         # useTheme, useWorkdirWatcher,
│   │   │                         # useBreakpoint, useResizable, useToast
│   │   ├── i18n/                 # index.ts + locales/ (en.json, zh.json)
│   │   ├── lib/                  # utils.ts (通用工具)
│   │   ├── mocks/                # commits.ts, diff.ts (测试 mock)
│   │   ├── plugins/              # naive.ts (Naive UI 按需注册)
│   │   ├── stores/               # Pinia: app, blame, branches, commits,
│   │   │                         # diff, remote, repo, rightPanel,
│   │   │                         # staging, submodule, tags, worktree
│   │   ├── types/                # git.d.ts, ipc.d.ts, key.ts
│   │   ├── utils/                # event.ts, ipc.ts, diff.ts,
│   │   │                         # gitgraphAdapter.ts, keys.ts
│   │   ├── App.vue
│   │   └── main.ts
│   └── src-tauri/                # Rust 后端
│       ├── Cargo.toml            # Rust 依赖
│       ├── tauri.conf.json       # Tauri 配置 (窗口 1200x800, 最小 800x600)
│       ├── capabilities/         # Tauri 权限声明
│       └── src/
│           ├── commands/         # Tauri IPC 命令: blame, branch, commit,
│           │                     # diff, gpg_key, hook, merge, remote,
│           │                     # repo, repo_key, reset, settings,
│           │                     # ssh_key, stash, submodule, tag,
│           │                     # watch, worktree
│           ├── models/           # 数据模型: blame, branch, commit, diff,
│           │                     # key, remote, repo, stash, submodule,
│           │                     # tag, worktree
│           ├── services/         # 业务逻辑: blame_service,
│           │                     # branch_service, commit_service,
│           │                     # diff_service, git_flow_service,
│           │                     # gpg_key_service, hook_service,
│           │                     # merge_service, remote_service,
│           │                     # repo_service, reset_service,
│           │                     # ssh_key_service, stash_service,
│           │                     # submodule_service, tag_service,
│           │                     # worktree_service
│           ├── utils/            # credential, error, retry, ssh_agent
│           ├── lib.rs            # 模块注册 + AppState (Arc<Mutex<RepoManager>>)
│           └── main.rs           # 入口
└── .worktrees/                   # Git worktree 功能分支
```

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Vue 3 Frontend                    │
│  ┌──────────┐ ┌──────────┐ ┌─────────────────────┐ │
│  │ Naive UI │ │ Pinia    │ │ Monaco Editor       │ │
│  │ Components│ │ Stores   │ │ (Diff/Code View)    │ │
│  └──────────┘ └──────────┘ └─────────────────────┘ │
│  ┌──────────┐ ┌──────────┐ ┌─────────────────────┐ │
│  │ UnoCSS   │ │ vue-i18n │ │ @vueuse/composables │ │
│  └──────────┘ └──────────┘ └─────────────────────┘ │
│                    │ Tauri IPC (invoke/listen)       │
├────────────────────┼────────────────────────────────┤
│                    ▼                                  │
│  ┌─────────────────────────────────────────────────┐│
│  │              Rust Backend (Tauri 2)              ││
│  │  ┌──────────┐ ┌──────────┐ ┌─────────────────┐ ││
│  │  │ commands │ │ services │ │ models          │ ││
│  │  └──────────┘ └──────────┘ └─────────────────┘ ││
│  │  ┌──────────┐ ┌──────────┐ ┌─────────────────┐ ││
│  │  │ git2     │ │ tokio    │ │ notify (fs watch)│ ││
│  │  └──────────┘ └──────────┘ └─────────────────┘ ││
│  │  ┌──────────┐ ┌──────────┐                      ││
│  │  │ keyring  │ │ tracing  │                      ││
│  │  └──────────┘ └──────────┘                      ││
│  └─────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
└── .worktrees/            # Feature branches
```

### 前端架构
- **组件化：** 按功能域拆分组件 (branch/commit/diff/graph/remote/repo)
- **状态管理：** Pinia stores 按域拆分 (app, branches, commits, diff, remote, repo, staging)
- **组合式函数：** 封装复用逻辑 (useGit, useGitEvent, useKeyboard 等)
- **主题系统：** CSS 变量 + dark/light 双主题
- **IPC 通信：** ipc.ts 封装 Tauri invoke，event.ts 封装 Tauri listen/emit

### 后端架构
- **分层：** commands (IPC 入口) → services (业务逻辑) → git2 (Git 操作)
- **状态管理：** AppState 持有 Arc<Mutex<RepoManager>> 管理多仓库
- **错误处理：** thiserror 统一错误类型，前端通过 IPC 获取结构化错误
- **凭证存储：** keyring 接入系统密钥链 (Windows Credential Manager / macOS Keychain)
- **文件监听：** notify 监听工作区变更，实时推送到前端

### Tauri IPC
- 24 个已注册命令，覆盖：repo/commit/branch/remote/diff/stash/settings
- 前端通过 `@tauri-apps/api` 的 invoke 调用 Rust 命令
- 后端通过 Tauri event 向前端推送实时状态 (文件变更、远程进度等)

## Available Skills

### 1. subagent-driven-development
**Use when:** Executing implementation plans with independent tasks in the current session

**Purpose:** Execute plan by dispatching fresh subagent per task, with two-stage review after each task

**Key Features:**
- Fresh subagent per task (no context pollution)
- Two-stage review: spec compliance first, then code quality
- Continuous execution without stopping between tasks
- Self-review + reviewer feedback loops

**When to use:**
- Implementation plan exists
- Tasks are mostly independent
- Stay in current session

**Reference:** `.agents/skills/subagent-driven-development/SKILL.md`

### 2. executing-plans
**Use when:** Executing implementation plans in a parallel session

**Purpose:** Manages parallel session for plan execution

**When to use:**
- Implementation plan exists
- Want isolated session
- Parallel execution preferred

**Reference:** `.agents/skills/executing-plans/SKILL.md`

### 3. using-git-worktrees
**Use when:** Starting feature work that needs workspace isolation

**Purpose:** Ensures isolated workspace exists via git worktrees

**Key Features:**
- Creates new worktree or verifies existing
- Isolates feature development
- Prevents context pollution

**Reference:** `.agents/skills/using-git-worktrees/SKILL.md`

## Usage

### Using Skills

Skills are invoked by the AI controller when relevant to the current task. To explicitly request a skill:

```
Use [skill-name] for this task
```

Example:
```
Use subagent-driven-development to execute the implementation plan
```

### Launch Commands

```powershell
# Agent Management
npm run agents:list            # List available agents/skills
npm run agents:info [skill]    # Show skill details

# Development
npm run dev:git-client         # Start git-client dev server (Vite + Tauri)
npm run build:git-client       # Build git-client for production
npm run dev:all                # Start all projects

# Testing
npm run test:git-client        # Run Vitest unit tests

# Workflow
npm run workflow:plan          # Create implementation plan
npm run workflow:execute       # Execute current plan
npm run workflow:review        # Run code review
```

### Rust Commands

```powershell
cd git-client/src-tauri
cargo test                     # Run Rust unit tests
cargo clippy                   # Lint Rust code
cargo build                    # Build Rust backend
```

## Subagent Roles

### Implementer
- Executes specific implementation tasks
- Follows TDD approach
- Self-reviews before completion

### Spec Reviewer
- Validates spec compliance
- Checks requirements coverage
- Identifies over/under-building

### Code Quality Reviewer
- Reviews code quality
- Checks patterns and practices
- Ensures maintainability

## Best Practices

1. **Always use isolated workspace** - Use `using-git-worktrees` for feature work
2. **Follow two-stage review** - Spec compliance before code quality
3. **Provide full context** - Subagents need complete task information
4. **Continuous execution** - Don't pause between tasks unless blocked
5. **Review loops** - Fix issues and re-review until approved
6. **Tauri IPC 边界** - 后端只通过 commands 暴露接口，前端通过 ipc.ts 统一调用
7. **状态一致性** - 后端为数据权威源，前端 Pinia store 为缓存层
8. **主题兼容** - 新组件必须同时支持 dark/light 主题

## Skill Dependencies

```
subagent-driven-development requires:
├── using-git-worktrees
├── writing-plans
└── requesting-code-review

Subagents use:
└── test-driven-development
```
