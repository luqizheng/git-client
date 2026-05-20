# Git 提交图动态布局实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现基于祖先关系的 Git 提交图动态布局，支持多分支在不同列显示，使用不同颜色，合并时使用直角连接线

**Architecture:** 核心布局算法封装在 `graphLayout.ts`，组件 `GraphyCell.vue` 使用算法计算结果渲染 SVG。算法通过建立 commitId 到行索引的映射，动态分配列索引，为每条活跃线分配颜色，生成直角路径段。

**Tech Stack:** TypeScript, Vue 3 Composition API, SVG

---

## 文件结构

```
src/
├── utils/
│   └── graphLayout.ts          # 新增：核心布局算法
└── components/commit/components/cells/
    └── GraphyCell.vue          # 修改：重写渲染逻辑
```

---

## Task 1: 创建 graphLayout.ts 布局算法

**Files:**
- Create: `src/utils/graphLayout.ts`
- Reference: `src/types/git.d.ts` (Commit 接口)

- [ ] **Step 1: 创建 graphLayout.ts 文件，定义类型和常量**

```typescript
export interface GraphNode {
  commitId: string
  rowIndex: number
  column: number
  color: string
  hasRefs: boolean
}

export interface PathSegment {
  type: 'vertical' | 'horizontal'
  x1: number
  y1: number
  x2: number
  y2: number
  color: string
}

export interface GraphLayout {
  columns: number
  nodes: GraphNode[]
  segments: PathSegment[]
}

export const COLUMN_WIDTH = 20
export const ROW_HEIGHT = 40
export const CENTER_X = 10
export const CIRCLE_RADIUS = 8

export const BRANCH_COLORS = [
  'var(--branch-color-1)',
  'var(--branch-color-2)',
  'var(--branch-color-3)',
  'var(--branch-color-4)',
  'var(--branch-color-5)',
  'var(--branch-color-6)',
  'var(--branch-color-7)',
  'var(--branch-color-8)',
]
```

- [ ] **Step 2: 实现 allocateColumns 函数（修正版 - 颜色继承自父节点）**

```typescript
function allocateColumns(commits: Commit[]): GraphNode[] {
  const nodes: GraphNode[] = []
  const activeColumns: Map<number, { color: string; commitId: string }> = new Map()
  let nextColumn = 0

  for (let i = 0; i < commits.length; i++) {
    const commit = commits[i]

    // 找出父节点
    const parentNodes = commit.parent_ids
      .map(pid => nodes.find(n => n.commitId === pid))
      .filter((n): n is GraphNode => n !== undefined)

    // 计算当前使用的列
    const usedColumns = new Set<number>(parentNodes.map(p => p.column))

    // 清理不再活跃的列
    for (const [col, data] of activeColumns) {
      if (!usedColumns.has(col) && !parentNodes.some(p => p.column === col)) {
        activeColumns.delete(col)
      }
    }

    // 确定当前节点的列和颜色
    let column: number
    let color: string

    if (parentNodes.length > 0) {
      // 有父节点：继承第一个父节点的列和颜色
      const firstParent = parentNodes[0]
      column = firstParent.column
      color = firstParent.color

      // 如果是合并（多个父节点），其他父节点释放其列
      if (parentNodes.length > 1) {
        for (let j = 1; j < parentNodes.length; j++) {
          const parentCol = parentNodes[j].column
          // 该列现在被合并占用，不再向下延伸
        }
      }
    } else {
      // 无父节点（新分支起点）：分配新列和新颜色
      column = nextColumn++
      color = BRANCH_COLORS[column % BRANCH_COLORS.length]
    }

    nodes.push({
      commitId: commit.id,
      rowIndex: i,
      column,
      color,
      hasRefs: !!(commit.refs && commit.refs.length > 0),
    })

    // 保持该列为活跃
    activeColumns.set(column, { color, commitId: commit.id })
  }

  return nodes
}
```

- [ ] **Step 4: 实现 generateSegments 函数（直角连接，支持多路合并）**

```typescript
function generateSegments(commits: Commit[], nodes: GraphNode[]): PathSegment[] {
  const segments: PathSegment[] = []
  const nodeMap = new Map(nodes.map(n => [n.commitId, n]))

  for (const node of nodes) {
    const commit = commits[node.rowIndex]
    const nodeY = node.rowIndex * ROW_HEIGHT + ROW_HEIGHT / 2
    const nodeX = node.column * COLUMN_WIDTH + CENTER_X

    // 垂直线：从当前节点延伸到下一行（如果下一行不是合并目标）
    if (node.rowIndex < commits.length - 1) {
      const nextCommit = commits[node.rowIndex + 1]
      const nextNode = nodeMap.get(nextCommit.id)
      
      // 只有当下一节点不在同一列时才画垂直线
      if (!nextNode || nextNode.column !== node.column) {
        segments.push({
          type: 'vertical',
          x1: nodeX,
          y1: nodeY + CIRCLE_RADIUS,
          x2: nodeX,
          y2: (node.rowIndex + 1) * ROW_HEIGHT + ROW_HEIGHT / 2 - CIRCLE_RADIUS,
          color: node.color,
        })
      }
    }

    // 处理所有父节点的连接线
    if (commit.parent_ids && commit.parent_ids.length > 0) {
      for (const parentId of commit.parent_ids) {
        const parentNode = nodeMap.get(parentId)
        if (!parentNode) continue

        const parentX = parentNode.column * COLUMN_WIDTH + CENTER_X
        const parentY = parentNode.rowIndex * ROW_HEIGHT + ROW_HEIGHT / 2

        if (parentNode.column === node.column) {
          // 同一列：只需垂直线
          segments.push({
            type: 'vertical',
            x1: nodeX,
            y1: nodeY + CIRCLE_RADIUS,
            x2: parentX,
            y2: parentY - CIRCLE_RADIUS,
            color: node.color,
          })
        } else {
          // 不同列：直角连接
          const midY = nodeY + ROW_HEIGHT / 4

          // 水平段：从当前节点水平移动到父节点列
          segments.push({
            type: 'horizontal',
            x1: nodeX,
            y1: nodeY,
            x2: parentX,
            y2: nodeY,
            color: node.color,
          })

          // 垂直段：从当前行垂直移动到父节点行
          segments.push({
            type: 'vertical',
            x1: parentX,
            y1: nodeY,
            x2: parentX,
            y2: parentY - CIRCLE_RADIUS,
            color: node.color,
          })
        }
      }
    }
  }

  return segments
}
```

- [ ] **Step 3: 实现 computeGraphLayout 主函数**

```typescript
import type { Commit } from '../types/git'

export function computeGraphLayout(commits: Commit[]): GraphLayout {
  if (commits.length === 0) {
    return { columns: 1, nodes: [], segments: [] }
  }

  const nodes = allocateColumns(commits)
  const segments = generateSegments(commits, nodes)

  const maxColumn = nodes.reduce((max, n) => Math.max(max, n.column), 0)

  return {
    columns: maxColumn + 1,
    nodes,
    segments,
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/utils/graphLayout.ts
git commit -m "feat(graph): add graphLayout algorithm for dynamic branch visualization"
```

---

## Task 2: 重写 GraphyCell.vue 组件

**Files:**
- Modify: `src/components/commit/components/cells/GraphyCell.vue`
- Reference: `src/utils/graphLayout.ts`

- [ ] **Step 1: 重写 script 部分，使用 computeGraphLayout**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import type { Commit } from '../../../../types/git'
import { computeGraphLayout, COLUMN_WIDTH, ROW_HEIGHT, CENTER_X, CIRCLE_RADIUS } from '../../../../utils/graphLayout'

const props = defineProps<{
  commits: Commit[]
}>()

const layout = computed(() => computeGraphLayout(props.commits))
const verticalSegments = computed(() => layout.value.segments.filter(s => s.type === 'vertical'))
const horizontalSegments = computed(() => layout.value.segments.filter(s => s.type === 'horizontal'))
const nodesWithRefs = computed(() => layout.value.nodes.filter(n => n.hasRefs))
</script>
```

- [ ] **Step 2: 重写 template，使用新的 SVG 结构**

```vue
<template>
  <svg
    :width="layout.columns * COLUMN_WIDTH"
    :height="commits.length * ROW_HEIGHT"
    :viewBox="`0 0 ${layout.columns * COLUMN_WIDTH} ${commits.length * ROW_HEIGHT}`"
    class="overflow-visible"
  >
    <!-- 垂直线段 -->
    <line
      v-for="seg in verticalSegments"
      :key="`v-${seg.x1}-${seg.y1}`"
      :x1="seg.x1" :y1="seg.y1" :x2="seg.x2" :y2="seg.y2"
      :stroke="seg.color"
      stroke-width="2"
    />

    <!-- 水平线段 -->
    <line
      v-for="seg in horizontalSegments"
      :key="`h-${seg.x1}-${seg.y1}`"
      :x1="seg.x1" :y1="seg.y1" :x2="seg.x2" :y2="seg.y2"
      :stroke="seg.color"
      stroke-width="2"
    />

    <!-- 节点圆圈 -->
    <circle
      v-for="node in layout.nodes"
      :key="node.commitId"
      :cx="node.column * COLUMN_WIDTH + CENTER_X"
      :cy="node.rowIndex * ROW_HEIGHT + ROW_HEIGHT / 2"
      :r="CIRCLE_RADIUS"
      :fill="node.color"
      :stroke="node.color"
      stroke-width="2"
    />

    <!-- 引用光环 -->
    <circle
      v-for="node in nodesWithRefs"
      :key="`ref-${node.commitId}`"
      :cx="node.column * COLUMN_WIDTH + CENTER_X"
      :cy="node.rowIndex * ROW_HEIGHT + ROW_HEIGHT / 2"
      :r="CIRCLE_RADIUS + 2"
      fill="transparent"
      stroke="rgba(63, 185, 80, 0.5)"
      stroke-width="2"
    />
  </svg>
</template>
```

- [ ] **Step 3: 更新 style 部分**

```vue
<style scoped>
svg {
  min-width: v-bind("`${COLUMN_WIDTH}px`");
}
</style>
```

- [ ] **Step 4: 运行开发服务器验证**

Run: `npm run dev:git-client`
Expected: 页面正常加载，无编译错误

- [ ] **Step 5: Commit**

```bash
git add src/components/commit/components/cells/GraphyCell.vue
git commit -m "feat(graph): rewrite GraphyCell with dynamic layout algorithm"
```

---

## Task 3: 调整 commit-list 容器样式

**Files:**
- Modify: `src/components/commit/components/commit-list/commit-list.vue`

- [ ] **Step 1: 检查并调整 GraphyCell 容器的 padding**

定位第 271-281 行的 GraphyCell 使用处：
```vue
<template v-if="col.id === 'graphy' && index === 0">
  <GraphyCell :commits="filteredCommits" />
</template>
```

- [ ] **Step 2: 确保容器样式正确（可能无需修改）**

验证 GraphyCell 的父容器没有额外的 padding/margin 影响布局

- [ ] **Step 3: Commit**

```bash
git add src/components/commit/components/commit-list/commit-list.vue
git commit -m "chore(graph): adjust commit-list container for dynamic graph width"
```

---

## 实施检查清单

- [ ] graphLayout.ts 编译无错误
- [ ] GraphyCell.vue 编译无错误
- [ ] 单分支提交正常显示
- [ ] 多分支分叉正确分配列
- [ ] 分支合并使用直角连接线
- [ ] 颜色正确区分不同分支
- [ ] 引用 (refs) 光环正常显示
