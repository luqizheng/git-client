# Git客户端 实施计划索引

> **For agentic workers:** 本项目拆分为多个独立计划文件，按序执行。每个计划可独立产出可测试的软件。使用 `superpowers:subagent-driven-development` 或 `superpowers:executing-plans` 逐任务执行。

**Goal:** 构建媲美GitKraken的桌面Git客户端，基于Tauri + Vue3 + libgit2

**Architecture:** 三层架构 — UI层(Vue3+Pinia) / IPC桥(Tauri invoke+event) / 核心层(Rust+git2)。前端不直接访问文件系统，所有IO走Rust。Rust侧每次操作重新open repository，git2调用通过spawn_blocking执行。

**Tech Stack:** Tauri 2.x, Vue3, TypeScript, Pinia, Naive UI, Monaco Editor, UnoCSS, vue-i18n, Canvas 2D, Rust, git2, tokio, notify, keyring, thiserror, tracing

---

## 执行顺序

| # | 计划文件 | 内容 | 依赖 |
|---|---------|------|------|
| 01 | [01-scaffolding](./2026-05-13-git-client-01-scaffolding.md) | 项目脚手架：Tauri+Vue3初始化、依赖安装、目录结构 | 无 |
| 02 | [02-rust-core](./2026-05-13-git-client-02-rust-core.md) | Rust核心：数据模型、AppError、AppState、RepoManager | 01 |
| 03 | [03-rust-services](./2026-05-13-git-client-03-rust-services.md) | Rust服务层：repo/commit/branch/remote/diff/merge/stash服务 | 02 |
| 04 | [04-rust-commands-watch](./2026-05-13-git-client-04-rust-commands-watch.md) | Rust IPC命令注册、文件监听notify、事件emit | 03 |
| 05 | [05-frontend-foundation](./2026-05-13-git-client-05-frontend-foundation.md) | 前端基础：Type定义、IPC封装、Pinia Store、Composables | 04 |
| 06 | [06-frontend-layout](./2026-05-13-git-client-06-frontend-layout.md) | 前端布局：AppLayout、Sidebar、Toolbar、StatusBar | 05 |
| 07 | [07-frontend-graph](./2026-05-13-git-client-07-frontend-graph.md) | 提交图Canvas渲染：拓扑排序、泳道分配、虚拟滚动 | 06 |
| 08 | [08-frontend-diff-commit](./2026-05-13-git-client-08-frontend-diff-commit.md) | Diff查看器(Monaco)+提交面板(StageArea+CommitEditor) | 06 |
| 09 | [09-frontend-features](./2026-05-13-git-client-09-frontend-features.md) | 分支/远程/冲突/标签/Stash组件 | 06 |
| 10 | [10-theme-i18n-shortcuts](./2026-05-13-git-client-10-theme-i18n-shortcuts.md) | 主题系统、国际化、键盘快捷键、配置持久化 | 06 |
| 11 | [11-testing-engineering](./2026-05-13-git-client-11-testing-engineering.md) | 测试策略、CI、日志、窗口管理、DX收尾 | 全部 |

## 规格文档参考

| 文档 | 内容 |
|------|------|
| [01-概述与架构](../specs/2026-05-12-git-client-design-01-overview-architecture.md) | 概述、技术栈、三层架构 |
| [02-前后端模块](../specs/2026-05-12-git-client-design-02-frontend-backend.md) | 前端模块、目录结构、后端模块、数据模型、错误处理 |
| [03-数据流与IPC](../specs/2026-05-12-git-client-design-03-data-flow-ipc.md) | 数据流、事件推送、Pinia Store、IPC命令清单 |
| [04-功能模块](../specs/2026-05-12-git-client-design-04-features.md) | 提交图算法、i18n、主题、Diff、冲突解决、凭证安全 |
| [05-测试与工程化](../specs/2026-05-12-git-client-design-05-testing-engineering.md) | 测试策略、工程审查(E1-E12)、配置持久化、窗口管理、日志、DX |

## 文件结构总览

### Rust后端

```
src-tauri/
├── Cargo.toml
├── build.rs
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
```

### Vue前端

```
src/
├── App.vue
├── main.ts
├── assets/styles/variables.css, themes/dark.css, themes/light.css
├── components/
│   ├── layout/  (AppLayout, Sidebar, Toolbar, StatusBar)
│   ├── repo/    (RepoPanel, RepoList, CloneDialog)
│   ├── graph/   (GraphView, CommitCanvas, CommitDetail)
│   ├── diff/    (DiffView, FileTree, MonacoDiff)
│   ├── commit/  (CommitPanel, CommitEditor, StageArea)
│   ├── branch/  (BranchTree, BranchDialog)
│   ├── remote/  (RemotePanel, SshConfig)
│   └── conflict/(ConflictResolver, ThreeWayDiff)
├── stores/      (repo, commits, branches, diff, staging, remote, app)
├── composables/ (useGit, useTheme, useI18n, useKeyboard, useGitEvent, useWorkdirWatcher)
├── i18n/        (index.ts, locales/en.json, locales/zh.json)
├── types/       (git.d.ts, ipc.d.ts)
└── utils/       (ipc.ts, event.ts, graphLayout.ts)
```

## 自审覆盖度

| 规格要求 | 覆盖 | 备注 |
|---------|------|------|
| 三层架构 | ✅ | 01-05 |
| E1 spawn_blocking | ✅ | 04 |
| E2 Repository生命周期 | ✅ | 02 |
| E3 游标分页 | ✅ | 03 |
| E4 SSH(git2内置) | ✅ | 04 |
| E5 AppState注入 | ✅ | 04 |
| E6 统一AppError | ✅ | 02 |
| E7 事件细分 | ✅ | 04 |
| E8 commit amend | ✅ | 03 |
| E9 init_repo | ✅ | 04 |
| E10 Monaco Diff | ✅ | 08 |
| E11 文件监听精确化 | ✅ | 04 |
| E12 键盘快捷键 | ✅ | 10 |
| DX1-DX7 | ✅ | 分散在各计划 |
| DX8 拖拽操作 | ❌ | MVP后补充 |
| fetch-progress事件 | ❌ | MVP后补充 |
| RepoList最近仓库 | ⚠️ | 占位，需完善 |
