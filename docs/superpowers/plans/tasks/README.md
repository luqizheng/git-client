# Git 客户端功能扩展 — 任务清单

> 来源: `docs/superpowers/plans/2026-05-17-git-client-features-implementation.md`
> 执行方式: superpowers:subagent-driven-development (推荐) 或 superpowers:executing-plans

**目标:** 实现对标 GitKraken/Sourcetree 的 13 个缺失功能模块。

**架构:** 遵循现有分层：Rust commands → services → git2；前端 Vue 3 → Pinia stores。通过 Tauri IPC 通信。

**技术栈:** Rust, Vue 3, TypeScript, Pinia, Tauri, git2, Naive UI

**关键代码模式:**
- ipc.ts 导出 `invoke(cmd, args?)` 函数
- Store 调用 `invoke<Type>('cmd_name', { arg1, arg2 })`
- Rust 命令使用 `state.repos.clone()` + `tokio::task::spawn_blocking` 模式
- lib.rs 用 `generate_handler!` 显式注册命令
- Branch 模型字段：`name, is_remote, is_head, target_commit_id, upstream`

---

## 阶段 1: P0 — 核心功能

| 任务 | 文件 | 描述 |
|------|------|------|
| 01 | [task-01-tag-model.md](./task-01-tag-model.md) | Tag — 后端模型 |
| 02 | [task-02-tag-service.md](./task-02-tag-service.md) | Tag — 后端服务 |
| 03 | [task-03-tag-commands.md](./task-03-tag-commands.md) | Tag — 命令与注册 |
| 04 | [task-04-tag-store.md](./task-04-tag-store.md) | Tag — 前端 Store |
| 05 | [task-05-tag-components.md](./task-05-tag-components.md) | Tag — 前端组件 |
| 06 | [task-06-cherry-pick-command.md](./task-06-cherry-pick-command.md) | Cherry-pick — 后端命令 |
| 07 | [task-07-cherry-pick-frontend.md](./task-07-cherry-pick-frontend.md) | Cherry-pick — 前端集成 |

## 阶段 2: P1 — 重要功能

| 任务 | 文件 | 描述 |
|------|------|------|
| 08 | [task-08-revert-service.md](./task-08-revert-service.md) | Revert — 后端服务 |
| 09 | [task-09-revert-command.md](./task-09-revert-command.md) | Revert — 后端命令 |
| 10 | [task-10-rebase-service.md](./task-10-rebase-service.md) | Rebase — 后端服务 |
| 11 | [task-11-rebase-command.md](./task-11-rebase-command.md) | Rebase — 后端命令 |
| 12 | [task-12-advanced-remote.md](./task-12-advanced-remote.md) | 高级远程操作 |

## 阶段 3: P2 — 有用功能

| 任务 | 文件 | 描述 |
|------|------|------|
| 13 | [task-13-submodule-model.md](./task-13-submodule-model.md) | Submodule — 后端模型 |
| 14 | [task-14-submodule-service.md](./task-14-submodule-service.md) | Submodule — 后端服务 |
| 15 | [task-15-submodule-commands.md](./task-15-submodule-commands.md) | Submodule — 后端命令 |
| 16 | [task-16-submodule-store.md](./task-16-submodule-store.md) | Submodule — 前端 Store |
| 17 | [task-17-submodule-component.md](./task-17-submodule-component.md) | Submodule — 前端组件 |
| 18 | [task-18-git-flow-service.md](./task-18-git-flow-service.md) | Git Flow — 后端服务 |
| 19 | [task-19-worktree-model.md](./task-19-worktree-model.md) | Worktree — 后端模型 |
| 20 | [task-20-worktree-service.md](./task-20-worktree-service.md) | Worktree — 后端服务 |
| 21 | [task-21-worktree-commands.md](./task-21-worktree-commands.md) | Worktree — 后端命令 |
| 22 | [task-22-advanced-search.md](./task-22-advanced-search.md) | 高级搜索 |

## 阶段 4: P3 — 增强功能

| 任务 | 文件 | 描述 |
|------|------|------|
| 23 | [task-23-branch-compare.md](./task-23-branch-compare.md) | 分支比较 |
| 24 | [task-24-hook-management.md](./task-24-hook-management.md) | Hook 管理 |
| 25 | [task-25-config-management.md](./task-25-config-management.md) | 配置管理 |
| 26 | [task-26-visual-enhancement.md](./task-26-visual-enhancement.md) | 可视化增强 |

---

## 统计

- **总任务数:** 26
- **后端任务:** 18 (Tasks 1-3, 6, 8-15, 18-25)
- **前端任务:** 8 (Tasks 4-5, 7, 16-17, 26)
- **阶段数:** 4 (P0, P1, P2, P3)
