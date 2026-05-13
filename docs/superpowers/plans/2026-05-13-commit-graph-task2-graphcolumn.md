# Task 2: 创建 GraphColumn.vue 组件

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** 创建左侧 SVG 图形列组件，包含节点渲染（圆形/方形）、贝塞尔曲线连线、分支标签、虚拟滚动。

**Architecture:** GraphColumn.vue 接收 commits 和 selectedId props，内部调用 computeGraphLayout 计算布局，通过 visibleRange 实现虚拟滚动。SVG 分两层：连线层（底层）和节点层（顶层）。

**Tech Stack:** Vue 3, SVG, TypeScript

**Dependencies:** Task 1（graphLayout.ts 的 isMerge 字段）

---

**Files:**
- Create: `src/components/graph/GraphColumn.vue`

- [ ] **Step 1: 创建 GraphColumn.vue 组件**

创建 `src/components/graph/GraphColumn.vue`:

```vue
<template>
  <div
    ref="containerRef"
    class="graph-column"
    :style="{ width: `${width}px` }"
    @scroll="onScroll"
  >
    <svg
      ref="svgRef"
      :viewBox="`0 0 ${width} ${svgHeight}`"
      preserveAspectRatio="none"
      class="w-full"
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
      </g>
    </svg>

    <div
      v-if="commits.length === 0"
      class="absolute inset-0 flex items-center justify-center text-gray-500 text-xs"
    >
      No commits
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { Commit } from '../../types/git'
import { computeGraphLayout, type GraphLayout, type LaneNode } from '../../utils/graphLayout'

const COLORS = [
  '#4fc3f7', '#81c784', '#fff176', '#ff8a65',
  '#ba68c8', '#f06292', '#4db6ac', '#aed581',
  '#90a4ae', '#ffb74d', '#e57373', '#64b5f6',
]

const ROW_HEIGHT = 40
const BUFFER_ROWS = 10
const LANE_WIDTH = 20

const props = defineProps<{
  width?: number
  commits: Commit[]
  selectedId: string | null
}>()

const emit = defineEmits<{
  select: [commit: Commit]
  'branch-click': [branchName: string]
}>()

const containerRef = ref<HTMLElement | null>(null)
const svgRef = ref<SVGSVGElement | null>(null)
const scrollTop = ref(0)
const viewportHeight = ref(600)

const graphWidth = computed(() => props.width ?? 120)

const layout = computed<GraphLayout>(() => {
  if (props.commits.length === 0) {
    return { nodes: [], lines: [], maxLane: 0 }
  }
  return computeGraphLayout(props.commits)
})

const svgHeight = computed(() => {
  return Math.max(600, props.commits.length * ROW_HEIGHT)
})

const visibleRange = computed(() => {
  const startRow = Math.floor(scrollTop.value / ROW_HEIGHT)
  return {
    start: Math.max(0, startRow - BUFFER_ROWS),
    end: Math.min(props.commits.length, startRow + Math.ceil(viewportHeight.value / ROW_HEIGHT) + BUFFER_ROWS)
  }
})

const visibleNodes = computed(() => {
  return layout.value.nodes.slice(visibleRange.value.start, visibleRange.value.end)
})

const visibleLines = computed(() => {
  const { start, end } = visibleRange.value
  const startY = start * ROW_HEIGHT - ROW_HEIGHT
  const endY = end * ROW_HEIGHT + ROW_HEIGHT
  return layout.value.lines.filter(line => {
    return line.fromY >= startY && line.fromY <= endY
  })
})

function getLaneX(lane: number): number {
  return 12 + lane * LANE_WIDTH
}

function getLaneColor(lane: number): string {
  return COLORS[lane % COLORS.length]
}

function getLinePath(line: { fromLane: number; toLane: number; fromY: number; toY: number; color: string }): string {
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

function getBranchRefs(node: LaneNode): string[] {
  return node.commit.refs.filter(ref => !ref.startsWith('tag:'))
}

function truncateTag(tag: string): string {
  const maxLen = 10
  if (tag.length <= maxLen) return tag
  return tag.slice(0, maxLen - 1) + '\u2026'
}

function getTagWidth(tag: string): number {
  return Math.max(40, tag.length * 6 + 8)
}

function onScroll() {
  if (!containerRef.value) return
  scrollTop.value = containerRef.value.scrollTop
  viewportHeight.value = containerRef.value.clientHeight
}

onMounted(() => {
  if (containerRef.value) {
    viewportHeight.value = containerRef.value.clientHeight
  }
})

watch(() => props.commits.length, () => {
  if (containerRef.value) {
    viewportHeight.value = containerRef.value.clientHeight
  }
})
</script>

<style scoped>
.graph-column {
  flex-shrink: 0;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
  background: var(--bg-primary, #1a1a1a);
}

.graph-column::-webkit-scrollbar {
  width: 4px;
}

.graph-column::-webkit-scrollbar-thumb {
  background: #444;
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
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/graph/GraphColumn.vue
git commit -m "feat: add GraphColumn.vue with SVG rendering, merge nodes, and branch tags"
```
