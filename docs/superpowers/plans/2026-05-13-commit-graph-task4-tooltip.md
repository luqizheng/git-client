# Task 4: 添加 Hover Tooltip 支持

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** 为 GraphColumn.vue 中的节点添加 Naive UI NTooltip 组件，hover 时显示完整 commit 信息。

**Architecture:** 在 SVG 节点外层包裹 NTooltip 组件。Tooltip 内容包括：完整 hash、作者、时间、合并类型、关联分支。

**Tech Stack:** Vue 3, Naive UI NTooltip

**Dependencies:** Task 2（GraphColumn.vue 组件）

---

**Files:**
- Modify: `src/components/graph/GraphColumn.vue`

- [ ] **Step 1: 修改 GraphColumn.vue 的节点层，添加 NTooltip 包裹**

在 `src/components/graph/GraphColumn.vue` 中，将 `<g class="nodes-layer">` 内部的 `<template>` 替换为带 NTooltip 的版本。

替换 `<template v-for="node in visibleNodes" :key="node.commit.id">` 到 `</template>` 之间的内容：

```vue
<template v-for="node in visibleNodes" :key="node.commit.id">
  <NTooltip
    trigger="hover"
    :delay="300"
    placement="right"
    :style="{ maxWidth: '280px' }"
  >
    <template #trigger>
      <circle
        v-if="!node.isMerge"
        :cx="getLaneX(node.lane)"
        :cy="node.y + ROW_HEIGHT / 2"
        :r="selectedId === node.commit.id ? 6 : 4"
        :fill="getLaneColor(node.lane)"
        stroke="#ffffff"
        :stroke-width="selectedId === node.commit.id ? 2 : 1.5"
        class="commit-node cursor-pointer transition-all duration-200"
        :class="{ 'selected': selectedId === node.commit.id }"
        @click.stop="$emit('select', node.commit)"
      />

      <rect
        v-else
        :x="getLaneX(node.lane) - (selectedId === node.commit.id ? 5 : 4)"
        :y="node.y + ROW_HEIGHT / 2 - (selectedId === node.commit.id ? 5 : 4)"
        :width="selectedId === node.commit.id ? 10 : 8"
        :height="selectedId === node.commit.id ? 10 : 8"
        rx="1"
        :fill="getLaneColor(node.lane)"
        stroke="#ffffff"
        :stroke-width="selectedId === node.commit.id ? 2 : 1.5"
        class="merge-node cursor-pointer transition-all duration-200"
        :class="{ 'selected': selectedId === node.commit.id }"
        @click.stop="$emit('select', node.commit)"
      />
    </template>

    <div class="text-xs space-y-1 p-1">
      <div class="font-mono text-blue-400">{{ node.commit.id }}</div>
      <div>{{ node.commit.author }}</div>
      <div class="text-gray-400">{{ formatFullTime(node.commit.time) }}</div>
      <div v-if="node.isMerge" class="text-yellow-400">
        {{ node.commit.parent_ids.length }}-way merge
      </div>
      <div v-if="node.commit.refs.length" class="mt-1">
        <span class="text-gray-400">Branches: </span>
        <span v-for="ref in node.commit.refs" :key="ref" class="text-green-400">
          {{ ref }}
        </span>
      </div>
    </div>
  </NTooltip>

  <g
    v-for="ref in getBranchRefs(node)"
    :key="ref"
    class="branch-tag cursor-pointer"
    @click.stop="$emit('branch-click', ref)"
  >
    <rect
      :x="getLaneX(node.lane) + 10"
      :y="node.y + ROW_HEIGHT / 2 - 8"
      :width="getTagWidth(ref)"
      height="16"
      rx="3"
      :fill="getLaneColor(node.lane) + '20'"
      :stroke="getLaneColor(node.lane)"
      stroke-width="1"
    />
    <text
      :x="getLaneX(node.lane) + 14"
      :y="node.y + ROW_HEIGHT / 2 + 4"
      :fill="getLaneColor(node.lane)"
      font-size="10"
      font-family="monospace"
    >{{ truncateTag(ref) }}</text>
  </g>
</template>
```

- [ ] **Step 2: 确保 NTooltip 导入和 formatFullTime 函数**

在 `<script setup>` 部分：

1. 确认 import 中包含：
```typescript
import { NTooltip } from 'naive-ui'
```

2. 添加 formatFullTime 函数：
```typescript
function formatFullTime(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString()
}
```

- [ ] **Step 3: 验证构建**

Run:
```powershell
cd d:\projects\req2task-2\git-client
npx vite build
```

Expected: 成功

- [ ] **Step 4: Commit**

```bash
git add src/components/graph/GraphColumn.vue
git commit -m "feat: add hover tooltip to GraphColumn nodes with full commit info"
```
