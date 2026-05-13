# Git客户端 实施计划 — 07: 提交图Canvas渲染

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现提交图Canvas渲染：拓扑排序、泳道分配算法、贝塞尔曲线连接、虚拟滚动、增量加载

**Architecture:** GraphView.vue管理Canvas和虚拟滚动。CommitCanvas.vue负责Canvas 2D分层渲染(背景/连接线/节点/标签)。提交图算法在纯TS中实现(拓扑排序+泳道分配)。支持增量加载和视口裁剪。

**Tech Stack:** Vue3, Canvas 2D API, TypeScript

---

### Task 1: 实现提交图布局算法

**Files:**
- Create: `src/utils/graphLayout.ts`

- [ ] **Step 1: 写图布局算法**

`src/utils/graphLayout.ts`:
```typescript
import type { Commit } from '../types/git'

export interface LaneNode {
  commit: Commit
  lane: number
  y: number
}

export interface LaneLine {
  fromLane: number
  toLane: number
  fromY: number
  toY: number
  color: string
}

export interface GraphLayout {
  nodes: LaneNode[]
  lines: LaneLine[]
  maxLane: number
}

const COLORS = [
  '#4fc3f7', '#81c784', '#fff176', '#ff8a65',
  '#ba68c8', '#f06292', '#4db6ac', '#aed581',
  '#90a4ae', '#ffb74d', '#e57373', '#64b5f6',
]

function getLaneColor(lane: number): string {
  return COLORS[lane % COLORS.length]
}

export function computeGraphLayout(commits: Commit[]): GraphLayout {
  const nodes: LaneNode[] = []
  const lines: LaneLine[] = []
  const commitLaneMap = new Map<string, number>()
  const branchLanes = new Map<string, number>()
  let nextLane = 0
  const rowHeight = 40

  for (let i = 0; i < commits.length; i++) {
    const commit = commits[i]
    let lane: number

    if (commitLaneMap.has(commit.id)) {
      lane = commitLaneMap.get(commit.id)!
    } else {
      lane = nextLane
      branchLanes.set(commit.id, lane)
      nextLane++
    }

    nodes.push({
      commit,
      lane,
      y: i * rowHeight,
    })

    for (const parentId of commit.parent_ids) {
      if (!commitLaneMap.has(parentId)) {
        commitLaneMap.set(parentId, lane)
      } else {
        const parentLane = commitLaneMap.get(parentId)!
        if (parentLane !== lane) {
          lines.push({
            fromLane: lane,
            toLane: parentLane,
            fromY: i * rowHeight,
            toY: (i + 1) * rowHeight,
            color: getLaneColor(lane),
          })
        }
      }
    }

    if (commit.parent_ids.length === 0 || i < commits.length - 1) {
      const nextCommit = commits[i + 1]
      if (nextCommit && commit.parent_ids.includes(nextCommit.id)) {
        lines.push({
          fromLane: lane,
          toLane: commitLaneMap.get(nextCommit.id) ?? lane,
          fromY: i * rowHeight,
          toY: (i + 1) * rowHeight,
          color: getLaneColor(lane),
        })
      }
    }
  }

  return { nodes, lines, maxLane: nextLane }
}
```

- [ ] **Step 2: 写测试**

`src/utils/__tests__/graphLayout.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { computeGraphLayout } from '../graphLayout'
import type { Commit } from '../../types/git'

function makeCommit(id: string, parents: string[] = []): Commit {
  return {
    id,
    message: `commit ${id}`,
    author: 'test',
    author_email: 'test@test.com',
    time: 0,
    parent_ids: parents,
  }
}

describe('computeGraphLayout', () => {
  it('assigns lanes to linear commits', () => {
    const commits = [makeCommit('c3', ['c2']), makeCommit('c2', ['c1']), makeCommit('c1')]
    const layout = computeGraphLayout(commits)
    expect(layout.nodes).toHaveLength(3)
    expect(layout.maxLane).toBeGreaterThanOrEqual(1)
  })

  it('handles branch commits', () => {
    const commits = [
      makeCommit('c4', ['c3', 'c2b']),
      makeCommit('c3', ['c2']),
      makeCommit('c2b', ['c1']),
      makeCommit('c2', ['c1']),
      makeCommit('c1'),
    ]
    const layout = computeGraphLayout(commits)
    expect(layout.nodes).toHaveLength(5)
    expect(layout.maxLane).toBeGreaterThanOrEqual(2)
  })
})
```

- [ ] **Step 3: 运行测试**

Run:
```powershell
cd d:\projects\req2task-2\git-client
npx vitest run src/utils/__tests__/graphLayout.test.ts
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/utils/graphLayout.ts src/utils/__tests__/graphLayout.test.ts
git commit -m "feat: add commit graph layout algorithm with lane assignment and tests"
```

---

### Task 2: 实现CommitCanvas渲染

**Files:**
- Modify: `src/components/graph/CommitCanvas.vue`

- [ ] **Step 1: 写CommitCanvas**

`src/components/graph/CommitCanvas.vue`:
```vue
<template>
  <canvas
    ref="canvasRef"
    :width="canvasWidth"
    :height="canvasHeight"
    @click="onClick"
    @mousemove="onMouseMove"
    class="cursor-pointer"
  />
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import type { Commit } from '../../types/git'
import { computeGraphLayout, type GraphLayout } from '../../utils/graphLayout'

const ROW_HEIGHT = 40
const NODE_RADIUS = 6
const LANE_WIDTH = 24
const LEFT_PADDING = 20

const props = defineProps<{
  commits: Commit[]
  scrollTop: number
  viewportHeight: number
  selectedId: string | null
}>()

const emit = defineEmits<{
  select: [commit: Commit]
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const canvasWidth = ref(800)
const canvasHeight = ref(600)
let layout: GraphLayout | null = null
let dpr = 1

function computeLayout() {
  if (props.commits.length === 0) {
    layout = { nodes: [], lines: [], maxLane: 0 }
    return
  }
  layout = computeGraphLayout(props.commits)
  const minWidth = LEFT_PADDING + (layout.maxLane + 1) * LANE_WIDTH + 300
  canvasWidth.value = Math.max(800, minWidth)
  canvasHeight.value = Math.max(600, props.commits.length * ROW_HEIGHT)
}

function render() {
  const canvas = canvasRef.value
  if (!canvas || !layout) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  dpr = window.devicePixelRatio || 1
  canvas.width = canvasWidth.value * dpr
  canvas.height = canvasHeight.value * dpr
  ctx.scale(dpr, dpr)

  ctx.clearRect(0, 0, canvasWidth.value, canvasHeight.value)

  const visibleTop = props.scrollTop
  const visibleBottom = props.scrollTop + props.viewportHeight
  const startIdx = Math.max(0, Math.floor(visibleTop / ROW_HEIGHT) - 1)
  const endIdx = Math.min(layout.nodes.length, Math.ceil(visibleBottom / ROW_HEIGHT) + 1)

  for (let i = startIdx; i < endIdx; i++) {
    const node = layout.nodes[i]
    const x = LEFT_PADDING + node.lane * LANE_WIDTH
    const y = node.y + ROW_HEIGHT / 2

    ctx.beginPath()
    ctx.arc(x, y, NODE_RADIUS, 0, Math.PI * 2)
    if (props.selectedId === node.commit.id) {
      ctx.fillStyle = '#fff'
      ctx.strokeStyle = '#4fc3f7'
      ctx.lineWidth = 3
    } else {
      ctx.fillStyle = '#4fc3f7'
      ctx.strokeStyle = '#4fc3f7'
      ctx.lineWidth = 1
    }
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = '#e0e0e0'
    ctx.font = '12px monospace'
    ctx.fillText(
      node.commit.id.slice(0, 7),
      LEFT_PADDING + (layout!.maxLane + 1) * LANE_WIDTH + 10,
      y + 4
    )
    ctx.fillStyle = '#9e9e9e'
    ctx.font = '12px sans-serif'
    ctx.fillText(
      node.commit.message.split('\n')[0],
      LEFT_PADDING + (layout!.maxLane + 1) * LANE_WIDTH + 80,
      y + 4
    )
  }

  for (const line of layout.lines) {
    if (line.fromY + ROW_HEIGHT < visibleTop || line.fromY > visibleBottom) continue
    const fromX = LEFT_PADDING + line.fromLane * LANE_WIDTH
    const toX = LEFT_PADDING + line.toLane * LANE_WIDTH
    const fromY = line.fromY + ROW_HEIGHT / 2
    const toY = line.toY + ROW_HEIGHT / 2

    ctx.beginPath()
    ctx.strokeStyle = line.color
    ctx.lineWidth = 2
    if (fromX === toX) {
      ctx.moveTo(fromX, fromY)
      ctx.lineTo(toX, toY)
    } else {
      ctx.moveTo(fromX, fromY)
      ctx.bezierCurveTo(fromX, fromY + (toY - fromY) / 2, toX, toY - (toY - fromY) / 2, toX, toY)
    }
    ctx.stroke()
  }
}

function onClick(e: MouseEvent) {
  if (!layout) return
  const rect = canvasRef.value!.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top + props.scrollTop
  const rowIdx = Math.floor(y / ROW_HEIGHT)
  if (rowIdx >= 0 && rowIdx < layout.nodes.length) {
    emit('select', layout.nodes[rowIdx].commit)
  }
}

function onMouseMove(e: MouseEvent) {
  // future: tooltip on hover
}

watch(() => [props.commits, props.scrollTop, props.selectedId], () => {
  if (props.commits.length > 0 && (!layout || layout.nodes.length !== props.commits.length)) {
    computeLayout()
  }
  requestAnimationFrame(render)
}, { deep: true })

onMounted(() => {
  computeLayout()
  render()
})
</script>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/graph/CommitCanvas.vue
git commit -m "feat: add CommitCanvas with 2D layered rendering, bezier curves, viewport culling"
```

---

### Task 3: 实现GraphView + CommitDetail + 虚拟滚动

**Files:**
- Modify: `src/components/graph/GraphView.vue`
- Modify: `src/components/graph/CommitDetail.vue`

- [ ] **Step 1: 写GraphView**

`src/components/graph/GraphView.vue`:
```vue
<template>
  <div class="flex-1 flex flex-col overflow-hidden" v-if="repo.currentRepo">
    <div
      ref="scrollContainer"
      class="flex-1 overflow-y-auto"
      @scroll="onScroll"
    >
      <CommitCanvas
        :commits="commits.commits"
        :scroll-top="scrollTop"
        :viewport-height="viewportHeight"
        :selected-id="commits.selectedCommit?.id ?? null"
        @select="commits.selectCommit"
      />
      <div v-if="commits.loading" class="text-center text-gray-500 py-4">Loading...</div>
      <div v-if="commits.hasMore && !commits.loading" ref="loadMoreRef" class="h-1" />
    </div>
  </div>
  <div v-else class="flex-1 flex items-center justify-center text-gray-500">
    Open a repository to get started
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import CommitCanvas from './CommitCanvas.vue'
import { useRepoStore } from '../../stores/repo'
import { useCommitsStore } from '../../stores/commits'
import { useWorkdirWatcher } from '../../composables/useWorkdirWatcher'
import { invoke } from '../../utils/ipc'

const repo = useRepoStore()
const commits = useCommitsStore()
useWorkdirWatcher()

const scrollContainer = ref<HTMLElement | null>(null)
const loadMoreRef = ref<HTMLElement | null>(null)
const scrollTop = ref(0)
const viewportHeight = ref(600)

function onScroll() {
  if (!scrollContainer.value) return
  scrollTop.value = scrollContainer.value.scrollTop
  viewportHeight.value = scrollContainer.value.clientHeight
}

let observer: IntersectionObserver | null = null

onMounted(async () => {
  if (repo.repoPath) {
    await commits.fetchLogs(repo.repoPath)
    await invoke('start_watch', { repoPath: repo.repoPath })
  }

  observer = new IntersectionObserver((entries) => {
    if (entries[0]?.isIntersecting && commits.hasMore && !commits.loading) {
      const lastCommit = commits.commits[commits.commits.length - 1]
      if (lastCommit && repo.repoPath) {
        commits.fetchLogs(repo.repoPath, 50, lastCommit.id)
      }
    }
  })
  if (loadMoreRef.value) {
    observer.observe(loadMoreRef.value)
  }
})

onUnmounted(() => {
  observer?.disconnect()
})
</script>
```

- [ ] **Step 2: 写CommitDetail**

`src/components/graph/CommitDetail.vue`:
```vue
<template>
  <div v-if="commit" class="p-3 border-b border-gray-700">
    <div class="text-sm font-mono text-blue-400">{{ commit.id.slice(0, 7) }}</div>
    <div class="text-sm text-gray-200 mt-1">{{ commit.message.split('\n')[0] }}</div>
    <div class="text-xs text-gray-500 mt-1">
      {{ commit.author }} &lt;{{ commit.author_email }}&gt;
    </div>
    <div class="text-xs text-gray-500">
      {{ new Date(commit.time * 1000).toLocaleString() }}
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Commit } from '../../types/git'
defineProps<{ commit: Commit | null }>()
</script>
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
git add src/components/graph/
git commit -m "feat: add GraphView with virtual scroll, CommitDetail, incremental loading"
```
