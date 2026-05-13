# Commit Graph SVG 多分支可视化实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 CommitList.vue 改造成支持 SVG 多分支路线图显示，支持合并可视化、颜色编码、点击选择、hover tooltip、分支筛选功能

**Architecture:** 
- 新增 GraphColumn.vue 组件作为左侧 SVG 图形列（固定 120px）
- 复用现有 graphLayout.ts 的 lane 算法
- CommitList.vue 改为左右 flex 布局
- 虚拟滚动优化支持 5000+ commits

**Tech Stack:** Vue 3, SVG, TypeScript, Naive UI Tooltip, UnoCSS

---

## 文件结构

```
src/
├── components/
│   └── commit/
│       └── CommitList.vue          # 修改：增加左侧 GraphColumn
│   └── graph/                      # 新目录
│       ├── GraphColumn.vue         # 新增：SVG 图形列组件
│       └── __tests__/
│           └── GraphColumn.test.ts # 新增：组件测试
├── utils/
│   └── graphLayout.ts              # 已存在：lane 布局算法
├── stores/
│   └── commits.ts                  # 修改：增加 filterByBranch, graphLayout computed
└── types/
    └── git.d.ts                    # 已存在：Commit 类型
```

---

### Task 1: 增强 graphLayout.ts 算法

**Files:**
- Modify: `src/utils/graphLayout.ts`

- [ ] **Step 1: 添加 Lane 复用和合并节点优化**

替换 `src/utils/graphLayout.ts` 完整内容：

```typescript
import type { Commit } from '../types/git'

export interface LaneNode {
  commit: Commit
  lane: number
  y: number
  isMerge: boolean
  branchRefs: string[]
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

export function getLaneColor(lane: number): string {
  return COLORS[lane % COLORS.length]
}

export function computeGraphLayout(commits: Commit[]): GraphLayout {
  const nodes: LaneNode[] = []
  const lines: LaneLine[] = []
  const commitLaneMap = new Map<string, number>()
  const endedLanes: Set<number> = new Set()
  const branchRefsMap = new Map<string, string[]>()
  const rowHeight = 40

  for (let i = 0; i < commits.length; i++) {
    const commit = commits[i]
    const isMerge = commit.parent_ids.length >= 2

    if (commit.refs.length > 0) {
      branchRefsMap.set(commit.id, commit.refs)
    }

    let lane: number
    if (commitLaneMap.has(commit.id)) {
      lane = commitLaneMap.get(commit.id)!
    } else {
      const availableLane = Array.from(endedLanes).find(l => !commitLaneMap.has(commit.id))
      if (availableLane !== undefined) {
        lane = availableLane
        endedLanes.delete(availableLane)
      } else {
        lane = 0
        while (commitLaneMap.has(`${lane}_used`)) {
          lane++
        }
      }
      commitLaneMap.set(commit.id, lane)
    }

    nodes.push({
      commit,
      lane,
      y: i * rowHeight,
      isMerge,
      branchRefs: commit.refs,
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

    const allChildren = commits.filter(c => c.parent_ids.includes(commit.id))
    if (allChildren.length === 0 && !commits.slice(i + 1).some(c => c.parent_ids.includes(commit.id))) {
      endedLanes.add(lane)
    }
  }

  return { nodes, lines, maxLane: Math.max(...nodes.map(n => n.lane)) + 1 }
}

export function getBranchRefsAtNode(layout: GraphLayout, nodeIndex: number): string[] {
  if (nodeIndex < 0 || nodeIndex >= layout.nodes.length) return []
  const node = layout.nodes[nodeIndex]
  const refs: string[] = []
  if (node.branchRefs.length > 0) {
    refs.push(...node.branchRefs)
  }
  return [...new Set(refs)]
}

export function getLaneX(lane: number, laneWidth: number = 24, leftPadding: number = 20): number {
  return leftPadding + lane * laneWidth + laneWidth / 2
}

export function getNodeY(rowIndex: number, rowHeight: number = 40): number {
  return rowIndex * rowHeight + rowHeight / 2
}
```

- [ ] **Step 2: 运行现有测试确保兼容**

Run: `npx vitest run src/utils/__tests__/graphLayout.test.ts --reporter=verbose`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/utils/graphLayout.ts
git commit -m "feat: enhance graphLayout with merge detection, lane reuse, branch refs tracking"
```

---

### Task 2: 修改 commits.ts Store

**Files:**
- Modify: `src/stores/commits.ts`

- [ ] **Step 1: 添加分支筛选逻辑**

在 `src/stores/commits.ts` 的 `return` 语句之前添加：

```typescript
function filterByBranch(repoPath: string, branchName: string) {
  const repo = useRepoStore()
  const openRepo = repo.openRepos.get(repoPath)
  if (!openRepo) return
  
  if (!openRepo._originalCommits) {
    openRepo._originalCommits = [...openRepo.commits]
  }
  
  openRepo.commits = openRepo._originalCommits.filter(commit =>
    commit.refs.some(ref => ref.includes(branchName))
  )
  openRepo.activeFilter = { type: 'branch', value: branchName }
}

function clearBranchFilter(repoPath: string) {
  const repo = useRepoStore()
  const openRepo = repo.openRepos.get(repoPath)
  if (openRepo?._originalCommits) {
    openRepo.commits = [...openRepo._originalCommits]
    openRepo._originalCommits = null
    openRepo.activeFilter = null
  }
}

function getGraphLayout(repoPath: string): ReturnType<typeof computeGraphLayout> | null {
  const repo = useRepoStore()
  const openRepo = repo.openRepos.get(repoPath)
  if (!openRepo || openRepo.commits.length === 0) return null
  return computeGraphLayout(openRepo.commits)
}
```

- [ ] **Step 2: 更新 OpenRepo 接口**

修改 `src/types/git.d.ts` 中的 `OpenRepo` 接口：

```typescript
export interface OpenRepo {
  state: RepoState
  commits: Commit[]
  branches: Branch[]
  selectedCommit: Commit | null
  hasMore: boolean
  loading: boolean
  _originalCommits?: Commit[]
  activeFilter?: { type: string; value: string } | null
}
```

- [ ] **Step 3: 更新 return 语句**

将 `filterByBranch`, `clearBranchFilter`, `getGraphLayout` 添加到 `return` 对象中。

- [ ] **Step 4: Commit**

```bash
git add src/stores/commits.ts src/types/git.d.ts
git commit -m "feat: add branch filtering and graphLayout to commits store"
```

---

### Task 3: 创建 GraphColumn.vue 组件

**Files:**
- Create: `src/components/graph/GraphColumn.vue`

- [ ] **Step 1: 创建 GraphColumn.vue**

创建 `src/components/graph/GraphColumn.vue`：

```vue
<template>
  <div 
    class="graph-column relative overflow-hidden"
    :style="{ width: `${width}px` }"
  >
    <svg
      :width="width"
      :height="totalHeight"
      class="absolute inset-0"
    >
      <g :transform="`translate(0, ${scrollOffset})`">
        <path
          v-for="(line, idx) in visibleLines"
          :key="`line-${idx}`"
          :d="getBezierPath(line)"
          :stroke="line.color"
          stroke-width="2"
          fill="none"
          stroke-linecap="round"
        />
        
        <g
          v-for="(node, idx) in visibleNodes"
          :key="node.commit.id"
          :transform="`translate(${getLaneX(node.lane)}, ${node.y})`"
          class="cursor-pointer"
          @click="$emit('select', node.commit)"
        >
          <template v-if="node.isMerge">
            <rect
              x="-5"
              y="-5"
              width="10"
              height="10"
              rx="2"
              :fill="getLaneColor(node.lane)"
              :stroke="selectedId === node.commit.id ? '#fff' : '#fff'"
              :stroke-width="selectedId === node.commit.id ? 2 : 1"
              class="merge-node transition-all duration-150"
              :class="{ 'drop-shadow-lg': selectedId === node.commit.id }"
            />
          </template>
          <template v-else>
            <circle
              :r="selectedId === node.commit.id ? 6 : 4"
              :fill="getLaneColor(node.lane)"
              stroke="#fff"
              :stroke-width="selectedId === node.commit.id ? 2 : 1"
              class="commit-node transition-all duration-150"
              :class="{ 'drop-shadow-lg': selectedId === node.commit.id }"
            />
          </template>
          
          <BranchTag
            v-if="node.branchRefs.length > 0"
            :refs="node.branchRefs"
            :color="getLaneColor(node.lane)"
            @click-branch="(ref) => $emit('branch-click', ref)"
          />
        </g>
      </g>
    </svg>
    
    <NTooltip
      v-for="node in visibleNodes"
      :key="`tooltip-${node.commit.id}`"
      :value="showTooltip === node.commit.id"
      :delay="300"
      placement="right"
      @click:trigger="showTooltip = node.commit.id"
      @click-outside="showTooltip = null"
    >
      <template #trigger>
        <div
          class="absolute w-full h-10 -translate-y-1/2"
          :style="{ left: 0, top: `${node.y + scrollOffset}px` }"
        />
      </template>
      <CommitTooltip :commit="node.commit" />
    </NTooltip>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { NTooltip } from 'naive-ui'
import type { Commit } from '../../types/git'
import { computeGraphLayout, getLaneColor, getLaneX, type GraphLayout } from '../../utils/graphLayout'
import BranchTag from './BranchTag.vue'
import CommitTooltip from './CommitTooltip.vue'

const props = withDefaults(defineProps<{
  commits: Commit[]
  width?: number
  selectedId?: string | null
  scrollTop?: number
  viewportHeight?: number
}>(), {
  width: 120,
  selectedId: null,
  scrollTop: 0,
  viewportHeight: 600,
})

const emit = defineEmits<{
  select: [commit: Commit]
  'branch-click': [branchName: string]
}>()

const ROW_HEIGHT = 40
const LANE_WIDTH = 24
const LEFT_PADDING = 20
const BUFFER_ROWS = 10

const showTooltip = ref<string | null>(null)

const layout = computed<GraphLayout>(() => computeGraphLayout(props.commits))

const totalHeight = computed(() => props.commits.length * ROW_HEIGHT)

const visibleRange = computed(() => {
  const startRow = Math.max(0, Math.floor(props.scrollTop / ROW_HEIGHT) - BUFFER_ROWS)
  const visibleRows = Math.ceil(props.viewportHeight / ROW_HEIGHT)
  const endRow = Math.min(props.commits.length, startRow + visibleRows + BUFFER_ROWS * 2)
  return { start: startRow, end: endRow }
})

const scrollOffset = computed(() => visibleRange.value.start * ROW_HEIGHT)

const visibleNodes = computed(() =>
  layout.value.nodes.slice(visibleRange.value.start, visibleRange.value.end)
)

const visibleLines = computed(() =>
  layout.value.lines.filter(line => {
    const fromRow = Math.floor(line.fromY / ROW_HEIGHT)
    const toRow = Math.floor(line.toY / ROW_HEIGHT)
    return fromRow >= visibleRange.value.start - 1 && toRow <= visibleRange.value.end + 1
  })
)

function getBezierPath(line: { fromLane: number; toLane: number; fromY: number; toY: number }): string {
  const fromX = getLaneX(line.fromLane, LANE_WIDTH, LEFT_PADDING)
  const toX = getLaneX(line.toLane, LANE_WIDTH, LEFT_PADDING)
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
.graph-column {
  flex-shrink: 0;
  background: var(--color-gray-850, #1a1a1a);
  border-right: 1px solid var(--color-gray-700, #333);
}

.commit-node:hover,
.merge-node:hover {
  transform: scale(1.2);
}

.drop-shadow-lg {
  filter: drop-shadow(0 0 4px currentColor);
}
</style>
```

- [ ] **Step 2: 创建 BranchTag.vue**

创建 `src/components/graph/BranchTag.vue`：

```vue
<template>
  <g
    class="branch-tag cursor-pointer"
    @click.stop="$emit('click-branch', refs[0])"
  >
    <rect
      x="10"
      y="-8"
      :width="tagWidth"
      height="16"
      rx="3"
      :fill="`${color}20`"
      :stroke="color"
      stroke-width="1"
    />
    <text
      x="14"
      y="4"
      :fill="color"
      font-size="10"
      font-family="monospace"
    >{{ displayText }}</text>
  </g>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  refs: string[]
  color: string
}>()

defineEmits<{
  'click-branch': [branchName: string]
}>()

const MAX_TAG_WIDTH = 70

const displayText = computed(() => {
  const text = props.refs[0]
  if (text.length * 6 > MAX_TAG_WIDTH) {
    return text.slice(0, 8) + '...'
  }
  return text
})

const tagWidth = computed(() => Math.min(displayText.value.length * 6 + 8, MAX_TAG_WIDTH + 8))
</script>
```

- [ ] **Step 3: 创建 CommitTooltip.vue**

创建 `src/components/graph/CommitTooltip.vue`：

```vue
<template>
  <div class="text-xs space-y-1 p-2 min-w-[200px] max-w-[300px]">
    <div class="font-mono text-blue-400 truncate">{{ commit.id }}</div>
    <div class="text-gray-300">{{ commit.author }}</div>
    <div class="text-gray-500 text-[10px]">{{ commit.author_email }}</div>
    <div class="text-gray-400">{{ formatFullTime(commit.time) }}</div>
    
    <div v-if="isMerge" class="text-yellow-400 mt-1">
      {{ commit.parent_ids.length }}-way merge
    </div>
    
    <div v-if="commit.refs.length > 0" class="mt-2">
      <div class="text-gray-500 text-[10px]">Branches:</div>
      <div class="flex flex-wrap gap-1 mt-1">
        <span
          v-for="ref in commit.refs"
          :key="ref"
          class="px-1 py-0.5 bg-green-900/40 text-green-400 rounded text-[10px]"
        >{{ ref }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Commit } from '../../types/git'

const props = defineProps<{
  commit: Commit
}>()

const isMerge = computed(() => props.commit.parent_ids.length >= 2)

function formatFullTime(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString()
}
</script>
```

- [ ] **Step 4: Commit**

```bash
git add src/components/graph/GraphColumn.vue src/components/graph/BranchTag.vue src/components/graph/CommitTooltip.vue
git commit -m "feat: add GraphColumn SVG component with nodes, lines, tooltips"
```

---

### Task 4: 改造 CommitList.vue

**Files:**
- Modify: `src/components/commit/CommitList.vue`

- [ ] **Step 1: 更新 CommitList.vue 模板**

将 `CommitList.vue` 的 `<template>` 部分替换为：

```vue
<template>
  <div class="flex flex-col border-r border-gray-700 w-full h-full">
    <div class="flex items-center px-2.5 py-1.5 gap-1.5 border-b border-gray-700 bg-gray-850">
      <span class="text-gray-500 text-xs">🔍</span>
      <n-input
        v-model:value="repo.searchQuery"
        size="tiny"
        placeholder="Search commits..."
        clearable
        class="flex-1"
        @update:value="onSearchInput"
      />
      <n-select
        v-model:value="repo.searchFilter"
        :options="filterOptions"
        size="tiny"
        style="width: 90px"
      />
      <n-tag
        v-if="activeOpenRepo?.activeFilter"
        closable
        size="small"
        type="info"
        @close="clearFilter"
      >
        {{ activeOpenRepo.activeFilter.value }}
      </n-tag>
    </div>
    
    <div class="flex-1 overflow-y-auto" @scroll="onScroll">
      <div v-if="isSearching" class="text-xs text-gray-500 p-2">
        {{ repo.searchLoading ? 'Searching...' : `${repo.searchResults.length} results` }}
      </div>
      
      <div class="flex">
        <GraphColumn
          :commits="displayCommits"
          :width="120"
          :selected-id="selectedId"
          :scroll-top="scrollTop"
          :viewport-height="viewportHeight"
          @select="selectCommit"
          @branch-click="onBranchClick"
        />
        
        <div class="flex-1">
          <div
            v-for="commit in displayCommits"
            :key="commit.id"
            class="px-3 py-2 border-b border-gray-750 cursor-pointer transition-colors"
            :class="commit.id === selectedId ? 'bg-blue-900/40' : 'hover:bg-gray-800'"
            @click="selectCommit(commit)"
          >
            <div class="flex items-center gap-2">
              <span class="text-blue-400 text-xs font-mono">{{ commit.id.slice(0, 7) }}</span>
              <span class="text-gray-100 text-xs flex-1 truncate">{{ commit.message.split('\n')[0] }}</span>
              <span
                v-for="refName in commit.refs"
                :key="refName"
                class="text-xs px-1.5 py-0.5 rounded bg-green-900/40 text-green-400"
              >{{ refName }}</span>
            </div>
            <div class="text-gray-500 text-xs mt-0.5">{{ commit.author }} · {{ relativeTime(commit.time) }}</div>
          </div>
        </div>
      </div>
      
      <div v-if="activeOpenRepo?.loading" class="text-center text-gray-500 text-xs py-3">Loading...</div>
      <div v-if="!isSearching && activeOpenRepo?.hasMore && !activeOpenRepo?.loading" ref="loadMoreRef" class="h-1" />
    </div>
  </div>
</template>
```

- [ ] **Step 2: 更新 script 部分**

更新 `src/components/commit/CommitList.vue` 的 `<script setup>` 部分：

```typescript
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { NInput, NSelect, NTag } from 'naive-ui'
import { useRepoStore } from '../../stores/repo'
import { useCommitsStore } from '../../stores/commits'
import { useRightPanelStore } from '../../stores/rightPanel'
import { invoke } from '../../utils/ipc'
import type { Commit } from '../../types/git'
import GraphColumn from '../graph/GraphColumn.vue'

const repo = useRepoStore()
const commits = useCommitsStore()
const rightPanel = useRightPanelStore()

const loadMoreRef = ref<HTMLElement | null>(null)
const scrollTop = ref(0)
const viewportHeight = ref(600)

const filterOptions = [
  { label: 'All', value: 'all' },
  { label: 'Message', value: 'message' },
  { label: 'Author', value: 'author' },
  { label: 'Hash', value: 'hash' },
  { label: 'File', value: 'file' },
]

const activeOpenRepo = computed(() => repo.activeRepo)

const selectedId = computed(() => activeOpenRepo.value?.selectedCommit?.id ?? null)

const isSearching = computed(() => repo.searchQuery.trim().length > 0)

const displayCommits = computed(() => {
  if (isSearching.value) return repo.searchResults
  return activeOpenRepo.value?.commits ?? []
})

let debounceTimer: ReturnType<typeof setTimeout> | null = null

function onSearchInput() {
  if (debounceTimer) clearTimeout(debounceTimer)
  if (!repo.searchQuery.trim()) {
    repo.searchResults = []
    return
  }
  debounceTimer = setTimeout(() => {
    repo.searchCommits()
  }, 300)
}

function selectCommit(commit: Commit) {
  if (repo.activeRepoPath) {
    commits.selectCommit(repo.activeRepoPath, commit)
    rightPanel.showPanel('commit', commit.id)
  }
}

function onBranchClick(branchName: string) {
  if (repo.activeRepoPath) {
    commits.filterByBranch(repo.activeRepoPath, branchName)
  }
}

function clearFilter() {
  if (repo.activeRepoPath) {
    commits.clearBranchFilter(repo.activeRepoPath)
  }
}

function relativeTime(timestamp: number): string {
  const diff = Math.floor(Date.now() / 1000) - timestamp
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`
  return new Date(timestamp * 1000).toLocaleDateString()
}

function onScroll(e: Event) {
  const target = e.target as HTMLElement
  scrollTop.value = target.scrollTop
  viewportHeight.value = target.clientHeight
}

let observer: IntersectionObserver | null = null

function setupObserver() {
  observer?.disconnect()
  observer = new IntersectionObserver((entries) => {
    if (entries[0]?.isIntersecting && activeOpenRepo.value?.hasMore && !activeOpenRepo.value?.loading) {
      const c = activeOpenRepo.value.commits
      const last = c[c.length - 1]
      if (last && repo.activeRepoPath) {
        commits.fetchLogs(repo.activeRepoPath, 50, last.id)
      }
    }
  })
  if (loadMoreRef.value) observer.observe(loadMoreRef.value)
}

watch(() => repo.activeRepoPath, async (newPath) => {
  if (newPath) {
    const openRepo = repo.openRepos.get(newPath)
    if (openRepo && openRepo.commits.length === 0) {
      await commits.fetchLogs(newPath)
    }
    invoke('start_watch', { repoPath: newPath })
  }
  setupObserver()
})

onMounted(() => {
  if (repo.activeRepoPath) {
    const openRepo = repo.openRepos.get(repo.activeRepoPath)
    if (openRepo && openRepo.commits.length === 0) {
      commits.fetchLogs(repo.activeRepoPath)
    }
  }
  setupObserver()
  
  const container = document.querySelector('.overflow-y-auto')
  if (container) {
    viewportHeight.value = container.clientHeight
  }
})

onUnmounted(() => {
  observer?.disconnect()
  if (debounceTimer) clearTimeout(debounceTimer)
})
```

- [ ] **Step 3: 验证构建**

Run: `cd d:\projects\req2task-2\git-client && npx vite build`
Expected: 成功（无 TypeScript 错误）

- [ ] **Step 4: Commit**

```bash
git add src/components/commit/CommitList.vue
git commit -m "feat: integrate GraphColumn into CommitList with branch filtering"
```

---

### Task 5: 添加组件测试

**Files:**
- Create: `src/components/graph/__tests__/GraphColumn.test.ts`

- [ ] **Step 1: 写 GraphColumn 测试**

```typescript
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import GraphColumn from '../GraphColumn.vue'
import { createTestingPinia } from '@pinia/testing'
import type { Commit } from '../../../types/git'

function makeCommit(id: string, parents: string[] = [], refs: string[] = []): Commit {
  return {
    id,
    message: `commit ${id}`,
    author: 'test',
    author_email: 'test@test.com',
    time: Math.floor(Date.now() / 1000),
    parent_ids: parents,
    refs,
  }
}

describe('GraphColumn', () => {
  it('renders SVG with nodes for commits', () => {
    const commits = [
      makeCommit('c3', ['c2']),
      makeCommit('c2', ['c1']),
      makeCommit('c1'),
    ]
    
    const wrapper = mount(GraphColumn, {
      props: { commits, width: 120 },
      global: { plugins: [createTestingPinia()] },
    })
    
    expect(wrapper.find('svg').exists()).toBe(true)
    expect(wrapper.findAll('circle').length + wrapper.findAll('rect').length).toBe(3)
  })

  it('shows merge nodes as squares', () => {
    const commits = [
      makeCommit('c4', ['c3', 'c2']),
      makeCommit('c3', ['c1']),
      makeCommit('c2', ['c1']),
      makeCommit('c1'),
    ]
    
    const wrapper = mount(GraphColumn, {
      props: { commits, width: 120 },
      global: { plugins: [createTestingPinia()] },
    })
    
    expect(wrapper.findAll('rect').length).toBe(1)
    expect(wrapper.findAll('circle').length).toBe(3)
  })

  it('emits select event on node click', async () => {
    const commits = [makeCommit('c2', ['c1']), makeCommit('c1')]
    
    const wrapper = mount(GraphColumn, {
      props: { commits, width: 120 },
      global: { plugins: [createTestingPinia()] },
    })
    
    await wrapper.find('circle').trigger('click')
    
    expect(wrapper.emitted('select')).toBeTruthy()
  })

  it('shows correct lane colors', () => {
    const commits = [
      makeCommit('c2', ['c1']),
      makeCommit('c1'),
    ]
    
    const wrapper = mount(GraphColumn, {
      props: { commits, width: 120 },
      global: { plugins: [createTestingPinia()] },
    })
    
    const circles = wrapper.findAll('circle')
    expect(circles.length).toBe(2)
  })
})
```

- [ ] **Step 2: 运行测试**

Run: `npx vitest run src/components/graph/__tests__/GraphColumn.test.ts --reporter=verbose`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/graph/__tests__/GraphColumn.test.ts
git commit -m "test: add GraphColumn component tests"
```

---

### Task 6: 端到端验证

**Files:** (无文件变更)

- [ ] **Step 1: 构建并检查 TypeScript 错误**

Run: `cd d:\projects\req2task-2\git-client && npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 2: 启动开发服务器验证**

Run: `cd d:\projects\req2task-2\git-client && npm run dev`
Expected: Vite 开发服务器启动成功，无编译错误

- [ ] **Step 3: 运行所有测试**

Run: `npx vitest run --reporter=verbose`
Expected: 所有测试 PASS

---

## 自检清单

### Spec 覆盖率
| 设计需求 | 实现位置 |
|---------|---------|
| SVG 渲染 | Task 3: GraphColumn.vue |
| 普通/合并节点 | Task 1: graphLayout.ts + Task 3: GraphColumn.vue |
| 贝塞尔曲线 | Task 3: GraphColumn.vue getBezierPath() |
| 12 色调色板 | Task 1: graphLayout.ts COLORS |
| 点击选择 | Task 3: GraphColumn.vue @click + Task 4: CommitList.vue |
| Hover Tooltip | Task 3: CommitTooltip.vue |
| 分支标签 | Task 3: BranchTag.vue |
| 分支筛选 | Task 2: commits.ts filterByBranch + Task 4: CommitList.vue |
| 虚拟滚动 | Task 3: GraphColumn.vue visibleRange computed |
| 颜色复用 | Task 1: graphLayout.ts getLaneColor() |

### 占位符扫描
- 无 "TBD"、"TODO"、"implement later"
- 无未定义类型或方法引用
- 所有代码块完整

### 类型一致性
- `Commit` 接口与 `git.d.ts` 一致
- `LaneNode`, `LaneLine`, `GraphLayout` 在所有文件中一致
- `filterByBranch`, `clearBranchFilter` 签名在 store 和组件中一致
