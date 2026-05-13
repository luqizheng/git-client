# Commit Graph SVG - Index

> **Execution:** Use subagent-driven-development or executing-plans.

**Goal:** 将 CommitList.vue 改造为支持多分支 SVG 图形路线图，内嵌左侧 120px 图形区域，支持合并节点、贝塞尔曲线连线、分支标签筛选、虚拟滚动优化。

**Architecture:** GraphColumn.vue (SVG 图形) + CommitList.vue (改造后双栏布局)。复用 `src/utils/graphLayout.ts` 已有的 lane 布局算法。虚拟滚动限制可视区域 DOM 节点数量。

**Tech Stack:** Vue 3, SVG, TypeScript, Naive UI Tooltip

**Design Spec:** `docs/superpowers/specs/2026-05-13-commit-graph-design.md`

---

## Task Files

| # | File | Description |
|---|------|-------------|
| 1 | `2026-05-13-commit-graph-task1-graphlayout.md` | 增强 graphLayout.ts 添加 isMerge 检测 |
| 2 | `2026-05-13-commit-graph-task2-graphcolumn.md` | 创建 GraphColumn.vue SVG 组件 |
| 3 | `2026-05-13-commit-graph-task3-commitlist.md` | 改造 CommitList.vue 双栏布局 |
| 4 | `2026-05-13-commit-graph-task4-tooltip.md` | 添加 Hover Tooltip 支持 |
| 5 | `2026-05-13-commit-graph-task5-virtualscroll.md` | 虚拟滚动优化验证 |
| 6 | `2026-05-13-commit-graph-task6-theme-edge.md` | 主题适配与边界处理 |

## Execution Order

Tasks 1→2→3 必须按序执行（有依赖关系）。Task 4/5/6 可在 Task 3 完成后按序执行。

## Key Files

| File | Role |
|------|------|
| `src/utils/graphLayout.ts` | Lane 布局算法（已有） |
| `src/components/graph/GraphColumn.vue` | 新建：SVG 图形组件 |
| `src/components/commit/CommitList.vue` | 修改：双栏布局 |
| `src/stores/commits.ts` | 修改：添加分支筛选 |
| `src/types/git.d.ts` | Commit 接口定义 |
