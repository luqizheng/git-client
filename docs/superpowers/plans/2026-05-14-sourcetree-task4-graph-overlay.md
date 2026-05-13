# Task 4: GraphOverlay SVG 叠加层

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** 创建 GraphOverlay.vue 组件，使用 SVG 绝对定位叠加层渲染 DAG 连线和节点

**Architecture:** SVG 层 position:absolute 在 scroll-content 内，pointer-events:none（节点 auto），只渲染可视范围。GraphCell 保持纯占位

**Tech Stack:** Vue 3, SVG, TypeScript

**Depends:** Task 3（CommitRow + GraphCell 占位）

---

**Files:**
- Create: `src/components/commit/components/GraphOverlay.vue`
- Modify: `src/components/commit/SourceTreeCommitList.vue` (集成 GraphOverlay)
- Modify: `src/utils/graphLayout.ts` (导出 commitLaneMap)

- [ ] **Step 1: 更新 graphLayout.ts 导出 commitLaneMap**

在 `src/utils/graphLayout.ts` 的 `GraphLayout` 接口中添加 `commitLaneMap`：

```typescript
export interface GraphLayout {
  nodes: LaneNode[]
  lines: LaneLine[]
  maxLane: number
  commitLaneMap: Map<string, { lane: number; isMerge: boolean }>
}
```

在 `computeGraphLayout` 函数中，在 `return` 之前添加：

```typescript
const commitLaneMapResult = new Map<string, { lane: number; isMerge: boolean }>()
for (const node of nodes) {
  commitLaneMapResult.set(node.commit.id, { lane: node.lane, isMerge: node.isMerge })
}

return { nodes, lines, maxLane: nextLane, commitLaneMap: commitLaneMapResult }
```

- [ ] **Step 2: 创建 GraphOverlay.vue**

```vue
<template>
  <svg
    class="graph-overlay"
    :style="{ width: graphWidth + 'px', height: totalHeight + 'px' }"
  >
    <g class="lines-layer">
      <path
        v-for="(line, idx) in visibleLines"
        :key="`line-${idx}`"
        :d="getLinePath(line)"
        :stroke="line.color"
        stroke-width="2"
        fill="none"
        stroke-linecap="round"
      />
    </g>
    <g class="nodes-layer">
      <template v-for="node in visibleNodes" :key="node.commit.id">
        <circle
          v-if="!node.isMerge"
          :cx="getLaneX(node.lane)"
          :cy="node.y + ROW_HEIGHT / 2"
          :r="selectedId === node.commit.id ? 6 : 4"
          :fill="getLaneColor(node.lane)"
          stroke="#ffffff"
          :stroke-width="selectedId === node.commit.id ? 2 : 1.5"
          class="commit-node cursor-pointer"
          :class="{ selected: selectedId === node.commit.id }"
          style="pointer-events: auto"
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
          class="merge-node cursor-pointer"
          :class="{ selected: selectedId === node.commit.id }"
          style="pointer-events: auto"
          @click.stop="$emit('select', node.commit)"
        />
      </template>
    </g>
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Commit } from '../../../types/git'
import { computeGraphLayout, getLaneColor, type GraphLayout } from '../../../utils/graphLayout'

const COLORS = [
  '#4fc3f7', '#81c784', '#fff176', '#ff8a65',
  '#ba68c8', '#f06292', '#4db6ac', '#aed581',
  '#90a4ae', '#ffb74d', '#e57373', '#64b5f6',
]

const ROW_HEIGHT = 40
const LANE_WIDTH = 20

const props = defineProps<{
  commits: Commit[]
  selectedId: string | null
  graphWidth: number
  scrollTop: number
  viewportHeight: number
}>()

defineEmits<{
  select: [commit: Commit]
}>()

const layout = computed<GraphLayout>(() => {
  if (props.commits.length === 0) {
    return { nodes: [], lines: [], maxLane: 0, commitLaneMap: new Map() }
  }
  return computeGraphLayout(props.commits)
})

const totalHeight = computed(() => props.commits.length * ROW_HEIGHT)

const BUFFER_PX = 200

const visibleNodes = computed(() => {
  const top = props.scrollTop - BUFFER_PX
  const bottom = props.scrollTop + props.viewportHeight + BUFFER_PX
  return layout.value.nodes.filter(node => node.y >= top && node.y <= bottom)
})

const visibleLines = computed(() => {
  const top = props.scrollTop - BUFFER_PX
  const bottom = props.scrollTop + props.viewportHeight + BUFFER_PX
  return layout.value.lines.filter(line => line.fromY >= top && line.fromY <= bottom + ROW_HEIGHT)
})

function getLaneX(lane: number): number {
  return 12 + lane * LANE_WIDTH
}

function getLinePath(line: { fromLane: number; toLane: number; fromY: number; toY: number }): string {
  const fromX = getLaneX(line.fromLane)
  const toX = getLaneX(line.toLane)
  const fromY = line.fromY + ROW_HEIGHT / 2
  const toY = line.toY + ROW_HEIGHT / 2

  if (fromX === toX) {
    return `M ${fromX} ${fromY} L ${toX} ${toY}`
  }

  const midY = (fromY + toY) / 2
  return `M ${fromX} ${fromY} Q ${fromX} ${midY} ${(fromX + toX) / 2} ${midY} Q ${toX} ${midY} ${toX} ${toY}`
}
</script>

<style scoped>
.graph-overlay {
  position: absolute;
  top: 0;
  left: var(--col-branch-width, 140px);
  pointer-events: none;
  z-index: 1;
}

.commit-node:hover,
.merge-node:hover {
  filter: brightness(1.2);
}

.commit-node.selected,
.merge-node.selected {
  filter: drop-shadow(0 0 4px currentColor);
}
</style>
```

- [ ] **Step 3: 在 SourceTreeCommitList.vue 中集成 GraphOverlay**

在 `<div class="scroll-content">` 内部，`<template v-for>` 之前添加：

```vue
<GraphOverlay
  :commits="displayCommits"
  :selected-id="selectedCommitId"
  :graph-width="getColumnWidth('graph')"
  :scroll-top="scrollTop"
  :viewport-height="containerHeight"
  @select="selectCommit"
/>
```

确保导入：
```typescript
import GraphOverlay from './components/GraphOverlay.vue'
```

确保 `useVirtualScroll` 返回的 `scrollTop` 和 `containerHeight` 传递给 GraphOverlay：

```typescript
const {
  scrollTop,
  containerHeight,
  totalHeight,
  visibleItems,
  handleScroll,
  updateContainerHeight,
} = useVirtualScroll(scrollContainer, virtualItems)
```

- [ ] **Step 4: 验证构建**

Run: `cd d:\projects\req2task-2\git-client; npx vite build`

Expected: 成功

- [ ] **Step 5: Commit**

```bash
git add src/components/commit/components/GraphOverlay.vue src/components/commit/SourceTreeCommitList.vue src/utils/graphLayout.ts
git commit -m "feat: add GraphOverlay SVG layer with DAG rendering"
```
