# Task 6: 主题适配与边界处理

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** 确保 GraphColumn.vue 支持 dark/light 主题，并处理空仓库、超多并行分支等边界情况。

**Architecture:** 使用 CSS 变量实现主题兼容。添加空状态提示和 lane 溢出提示。

**Tech Stack:** Vue 3, CSS Variables

**Dependencies:** Task 2（GraphColumn.vue 组件）

---

**Files:**
- Modify: `src/components/graph/GraphColumn.vue`

- [ ] **Step 1: 适配 dark/light 主题**

在 `src/components/graph/GraphColumn.vue` 的 `<style scoped>` 部分，确保使用 CSS 变量：

```css
.graph-column {
  flex-shrink: 0;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
  background: var(--bg-primary, #1a1a1a);
  color: var(--text-primary, #e0e0e0);
}

.graph-column::-webkit-scrollbar {
  width: 4px;
}

.graph-column::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb, #444);
  border-radius: 2px;
}

.commit-node:hover,
.merge-node:hover {
  filter: brightness(1.2);
}

.commit-node.selected,
.merge-node.selected {
  filter: drop-shadow(0 0 4px currentColor);
}
```

- [ ] **Step 2: 处理空仓库状态**

确认 GraphColumn.vue 中已存在空状态提示：

```vue
<div
  v-if="commits.length === 0"
  class="absolute inset-0 flex items-center justify-center text-gray-500 text-xs"
>
  No commits
</div>
```

如果不存在，添加到 `<svg>` 之后。

- [ ] **Step 3: 处理超多并行分支（>12 lanes）**

在 `src/components/graph/GraphColumn.vue` 的 `<template>` 中，在 `</svg>` 之后添加 lane 溢出提示：

```vue
<div
  v-if="layout.maxLane > 12"
  class="absolute top-2 right-2 text-xs text-yellow-500"
>
  +{{ layout.maxLane - 12 }} more lanes
</div>
```

- [ ] **Step 4: 验证构建**

Run:
```powershell
cd d:\projects\req2task-2\git-client
npx vite build
```

Expected: 成功

- [ ] **Step 5: Commit**

```bash
git add src/components/graph/GraphColumn.vue
git commit -m "feat: add theme support and edge case handling for GraphColumn"
```
