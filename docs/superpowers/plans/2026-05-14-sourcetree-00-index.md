# SourceTree 风格 CommitList 实施计划 - 索引

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** 将 CommitList 改造为 SourceTree 风格的多列 DAG 提交历史视图

**Architecture:** 纯手写组件，SVG 叠加层渲染 DAG，变高行虚拟滚动，NDropdown 右键菜单，position:sticky 固定列

**Tech Stack:** Vue 3, TypeScript, Naive UI NDropdown, SVG, Rust/git2

**Design Spec:** `docs/superpowers/specs/2026-05-14-sourcetree-commitlist-design.md`

---

## Task Files

| # | File | Description | Depends |
|---|------|-------------|---------|
| 0 | `2026-05-14-sourcetree-task0-commitref.md` | CommitRef 类型扩展（前后端） | - |
| 1 | `2026-05-14-sourcetree-task1-composables.md` | 4 个 composables | 0 |
| 2 | `2026-05-14-sourcetree-task2-main-container.md` | 主容器 + ColumnHeader | 1 |
| 3 | `2026-05-14-sourcetree-task3-row-cells.md` | CommitRow + Cell 组件 | 2 |
| 4 | `2026-05-14-sourcetree-task4-graph-overlay.md` | GraphOverlay SVG + GraphCell 占位 | 3 |
| 5 | `2026-05-14-sourcetree-task5-time-grouping.md` | TimeGroupHeader + useTimeGrouping | 3 |
| 6 | `2026-05-14-sourcetree-task6-context-menu.md` | NDropdown 右键菜单 | 3 |
| 7 | `2026-05-14-sourcetree-task7-dragdrop-solo.md` | 拖放 + Solo/Hide 分支筛选 | 3, 6 |
| 8 | `2026-05-14-sourcetree-task8-rust-commands.md` | Rust 后端 cherry_pick/rebase/reset | 0 |

## Execution Order

```
Task 0 → Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → Task 6 → Task 7
                                                  ↘
                                          Task 8 (parallel after Task 0)
```

## Key Files Map

| File | Role | Task |
|------|------|------|
| `src-tauri/src/models/commit.rs` | CommitRef + RefType 定义 | 0 |
| `src-tauri/src/services/commit_service.rs` | build_ref_map 重写 | 0 |
| `src/types/git.d.ts` | 前端 CommitRef 接口 | 0 |
| `src/components/commit/composables/useResizableColumns.ts` | 列宽调整 | 1 |
| `src/components/commit/composables/useVirtualScroll.ts` | 变高行虚拟滚动 | 1 |
| `src/components/commit/composables/useDragDrop.ts` | 拖放逻辑 | 1 |
| `src/components/commit/composables/useTimeGrouping.ts` | 时间分组 | 1 |
| `src/components/commit/SourceTreeCommitList.vue` | 主容器 | 2 |
| `src/components/commit/components/ColumnHeader.vue` | 列头 | 2 |
| `src/components/commit/components/CommitRow.vue` | 单行 | 3 |
| `src/components/commit/components/BranchTagCell.vue` | 分支标签 | 3 |
| `src/components/commit/components/GraphCell.vue` | 占位 div | 4 |
| `src/components/commit/components/GraphOverlay.vue` | SVG 叠加层 | 4 |
| `src/components/commit/components/TimeGroupHeader.vue` | 时间分组头 | 5 |
| `src/stores/commits.ts` | 更新 filterByBranch | 7 |
| `src-tauri/src/commands/cherry_pick.rs` | cherry_pick 命令 | 8 |
| `src-tauri/src/commands/rebase.rs` | rebase 命令 | 8 |
| `src-tauri/src/commands/reset.rs` | reset 命令 | 8 |
