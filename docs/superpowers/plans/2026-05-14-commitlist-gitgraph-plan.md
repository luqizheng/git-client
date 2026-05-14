# CommitList 重写实施计划 — 使用 @gitgraph/js

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 删除 SourceTreeCommitList.vue 和 CommitList.vue，使用 @gitgraph/js 重写为单一组件，左右分栏布局（graph + 信息列），保留搜索/虚拟滚动/右键菜单/可调列宽。

**Architecture:** @gitgraph/js 全量渲染 SVG graph 到左侧固定宽度区域；右侧 commit 信息行用虚拟滚动 + 绝对定位，Y 坐标与 graph 节点对齐；共享滚动容器实现同步滚动。数据适配层将声明式 Commit[] 转换为 @gitgraph/js 命令式 API 调用。

**Tech Stack:** Vue 3 (Composition API) + TypeScript + @gitgraph/js v1.4.0 + Naive UI + UnoCSS + Pinia

**Spec:** [2026-05-14-commitlist-gitgraph-redesign.md](../specs/2026-05-14-commitlist-gitgraph-redesign.md)

---

## Task 1: 安装依赖并验证 @gitgraph/js

**Files:**
- Modify: `git-client/package.json` (确认依赖存在)
- Run: `npm install`

- [ ] **Step 1: 确认 package.json 中已有 @gitgraph/js 依赖**

package.json 第 19 行应包含:
```json
"@gitgraph/js": "^1.4.0"
```

- [ ] **Step 2: 安装依赖**

Run: `cd git-client && npm install`
Expected: @gitgraph/js 成功安装到 node_modules/@gitgraph/js

- [ ] **Step 3: 验证 @gitgraph/js 可导入**

检查 `node_modules/@gitgraph/js/lib/index.d.ts` 存在，导出内容包含 `createGitgraph`, `Gitgraph`, `TemplateName`, `Orientation`, `Template`, `Branch`, `Mode`, `CommitOptions`

- [ ] **Step 4: Commit**

```bash
git add git-client/package.json git-client/package-lock.json
git commit -m "chore: verify @gitgraph/js dependency"
```

---

## Task 2: 创建 GitGraph 数据适配器

**Files:**
- Create: `git-client/src/utils/gitgraphAdapter.ts`

- [ ] **Step 1: 编写适配器核心函数**

```typescript
import { createGitgraph, Gitgraph, TemplateName, Orientation, Mode, Branch, CommitOptions } from '@gitgraph/js'
import type { Commit } from '../types/git'

export interface GitGraphRenderResult {
  gitgraph: Gitgraph
  commitYMap: Map<string, number>
}

export function renderCommitsToGitgraph(
  container: HTMLElement,
  commits: Commit[]
): GitGraphRenderResult | null {
  if (commits.length === 0) return null

  container.innerHTML = ''
  const gitgraph = createGitgraph(container, {
    template: TemplateName.SVGArrow,
    orientation: Orientation.VerticalReverse,
    mode: Mode.Compact,
  })

  const commitYMap = new Map<string, number>()
  const branchMap = new Map<string, Branch>()
  const commitIndexMap = new Map<string, number>()

  commits.forEach((c, i) => commitIndexMap.set(c.id, i))

  const api = gitgraph.api

  if (commits.length > 0) {
    const first = commits[0]
    const master = api.branch({ name: 'master' })
    branchMap.set('master', master)
    master.commit({
      hash: first.id,
      subject: first.message.split('\n')[0],
      author: { name: first.author, email: first.author_email || '', timestamp: first.time * 1000 },
      refs: first.refs.map(r => r.name).join(', ') || undefined,
    } as CommitOptions)
  }

  for (let i = 1; i < commits.length; i++) {
    const commit = commits[i]
    const parents = commit.parent_ids

    let targetBranch: Branch | undefined

    if (parents.length > 0) {
      const firstParentId = parents[0]
      for (const [, branch] of branchMap) {
        targetBranch = branch
        break
      }
    }

    if (!targetBranch) {
      const bName = `branch-${i}`
      targetBranch = api.branch({ name: bName })
      branchMap.set(bName, targetBranch)
    }

    const isMerge = parents.length > 1

    if (isMerge && parents.length > 1) {
      for (let p = 1; p < parents.length; p++) {
        const mergeBranchName = `merge-${commit.id.slice(0, 7)}-${p}`
        let mergeBranch = branchMap.get(mergeBranchName)
        if (!mergeBranch) {
          mergeBranch = api.branch({ name: mergeBranchName })
          branchMap.set(mergeBranchName, mergeBranch)
        }
        mergeBranch.commit({
          hash: parents[p],
          subject: '',
          author: { name: commit.author, email: commit.author_email || '' },
        } as CommitOptions)
        try {
          targetBranch.merge(mergeBranch)
        } catch {
          // merge may fail if branch already merged, ignore
        }
      }
    }

    targetBranch.commit({
      hash: commit.id,
      subject: commit.message.split('\n')[0],
      author: { name: commit.author, email: commit.author_email || '', timestamp: commit.time * 1000 },
      refs: commit.refs.map(r => r.name).join(', ') || undefined,
    } as CommitOptions)
  }

  requestAnimationFrame(() => {
    const svgs = container.querySelectorAll<SVGSVGElement>('svg')
    svgs.forEach(svg => {
      const commitNodes = svg.querySelectorAll<HTMLElement>('[data-commit-hash], .commit')
      // 尝试多种选择器匹配 gitgraph 生成的 commit 节点
      const allGroups = svg.querySelectorAll<SVGGElement>('g')

      let found = 0
      allGroups.forEach(g => {
        const hashAttr = g.getAttribute('data-hash') || g.getAttribute('data-commit-hash') || g.getAttribute('id') || ''
        if (!hashAttr) {
          const titleEl = g.querySelector<SVGTitleElement>('title')
          if (titleEl) {
            const text = titleEl.textContent || ''
            const matchingCommit = commits.find(c => text.includes(c.id.slice(0, 7)))
            if (matchingCommit) {
              const bbox = g.getBBox()
              commitYMap.set(matchingCommit.id, bbox.y)
              found++
            }
          }
        } else {
          const matchingCommit = commits.find(c =>
            hashAttr.includes(c.id) || c.id.includes(hashAttr) ||
            hashAttr.includes(c.id.slice(0, 7)) || c.id.slice(0, 7).includes(hashAttr)
          )
          if (matchingCommit) {
            const bbox = g.getBBox()
            commitYMap.set(matchingCommit.id, bbox.y)
            found++
          }
        }
      })

      // fallback: 按顺序分配 Y 坐标
      if (found < commits.length) {
        const rowHeight = getRowHeightFromSvg(svg)
        const unassigned = commits.filter(c => !commitYMap.has(c.id))
        unassigned.forEach((c, idx) => {
          if (!commitYMap.has(c.id)) {
            const ci = commitIndexMap.get(c.id)
            if (ci !== undefined) {
              commitYMap.set(c.id, ci * rowHeight)
            }
          }
        })
      }
    })
  })

  return { gitgraph, commitYMap }
}

function getRowHeightFromSvg(svg: SVGSVGElement): number {
  const children = svg.querySelectorAll('g')
  if (children.length < 2) return 40
  const yPositions: number[] = []
  children.forEach(g => {
    const bbox = g.getBBox()
    if (bbox.y > 0) yPositions.push(bbox.y)
  })
  yPositions.sort((a, b) => a - b)
  if (yPositions.length < 2) return 40
  let minDiff = Infinity
  for (let i = 1; i < Math.min(yPositions.length, 10); i++) {
    minDiff = Math.min(minDiff, yPositions[i] - yPositions[i - 1])
  }
  return minDiff > 10 ? Math.round(minDiff) : 40
}
```

- [ ] **Step 2: Commit**

```bash
git add git-client/src/utils/gitgraphAdapter.ts
git commit -m "feat: add gitgraph adapter for Commit[] -> @gitgraph/js conversion"
```

---

## Task 3: 创建 CommitList.vue 基础结构

**Files:**
- Create: `git-client/src/components/commit/CommitList.vue`
- Modify: `git-client/src/App.vue` (更新 import)

- [ ] **Step 1: 编写 CommitList.vue 完整代码**

```vue
<template>
  <div class="commit-list">
    <!-- Toolbar -->
    <div class="toolbar">
      <svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
      </svg>
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
      <n-button
        v-if="activeBranchFilter"
        size="tiny"
        quaternary
        @click="clearBranchFilter"
      >
        <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
        {{ activeBranchFilter }}
      </n-button>
    </div>

    <!-- Column Header -->
    <ColumnHeader
      :columns="columns"
      :graph-width="graphWidth"
      @resize="resizeColumn"
    />

    <!-- Body: shared scroll container -->
    <div ref="scrollContainer" class="body" @scroll="onScroll">
      <!-- Left: GitGraph layer -->
      <div class="graph-layer" :style="{ width: graphWidth + 'px', minWidth: graphWidth + 'px' }">
        <div ref="gitgraphEl" class="gitgraph-container" />
      </div>

      <!-- Right: Virtualized rows -->
      <div
        class="rows-layer"
        :style="{ height: totalHeight + 'px', minHeight: displayCommits.length > 0 ? '40px' : '0' }"
      >
        <div
          v-for="item in visibleItems"
          :key="item.commit.id"
          class="commit-row"
          :class="{ selected: item.commit.id === selectedId }"
          :style="{ transform: `translateY(${item.offset}px)` }"
          @click="selectCommit(item.commit)"
          @contextmenu="handleContextMenu($event, item.commit)"
        >
          <div class="cell cell-branch" :style="{ width: getColumnWidth('branch') + 'px' }">
            <template v-if="item.commit.refs?.length > 0">
              <span
                v-for="ref in item.commit.refs.slice(0, 3)"
                :key="ref.name"
                class="ref-tag"
                :class="ref.ref_type"
                @click.stop="onBranchClick(ref.name)"
              >{{ ref.name }}</span>
            </template>
          </div>
          <div class="cell cell-message" :style="{ width: getColumnWidth('message') + 'px' }">
            <span class="msg-text">{{ item.commit.message.split('\n')[0] }}</span>
          </div>
          <div class="cell cell-author" :style="{ width: getColumnWidth('author') + 'px' }">
            {{ item.commit.author }}
          </div>
          <div class="cell cell-date" :style="{ width: getColumnWidth('date') + 'px' }">
            {{ formatTime(item.commit.time) }}
          </div>
        </div>
      </div>

      <!-- Load more sentinel -->
      <div ref="loadMoreSentinel" class="h-1" />

      <!-- Empty state -->
      <div v-if="displayCommits.length === 0 && !loading" class="empty-state">
        No commits
      </div>
    </div>

    <!-- Context Menu -->
    <NDropdown
      trigger="manual"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :options="contextMenuOptions"
      :show="contextMenu.visible"
      placement="bottom-start"
      @select="handleMenuAction"
      @clickoutside="closeContextMenu"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch, onMounted, onUnmounted, h, nextTick } from 'vue'
import { NInput, NSelect, NButton, NDropdown } from 'naive-ui'
import type { DropdownOption } from 'naive-ui'
import { useRepoStore } from '../../stores/repo'
import { useCommitsStore } from '../../stores/commits'
import { useRightPanelStore } from '../../stores/rightPanel'
import { invoke } from '../../utils/ipc'
import type { Commit } from '../../types/git'
import { renderCommitsToGitgraph } from '../../utils/gitgraphAdapter'
import { useResizableColumns } from './composables/useResizableColumns'
import { useVirtualScroll, createVirtualItems, COMMIT_ROW_HEIGHT } from './composables/useVirtualScroll'
import { useInfiniteScroll } from './composables/useInfiniteScroll'
import ColumnHeader from './components/ColumnHeader.vue'

const repo = useRepoStore()
const commitsStore = useCommitsStore()
const rightPanel = useRightPanelStore()

const { columns, resizeColumn, getColumnWidth } = useResizableColumns()

const scrollContainer = ref<HTMLElement | null>(null)
const gitgraphEl = ref<HTMLElement | null>(null)
const loadMoreSentinel = ref<HTMLElement | null>(null)

const activeOpenRepo = computed(() => repo.activeRepo)
const loading = computed(() => activeOpenRepo.value?.loading ?? false)
const hasMore = computed(() => activeOpenRepo.value?.hasMore ?? false)
const selectedId = computed(() => activeOpenRepo.value?.selectedCommit?.id ?? null)
const isSearching = computed(() => repo.searchQuery.trim().length > 0)

const activeBranchFilter = ref<string | null>(null)

const filterOptions = [
  { label: 'All', value: 'all' },
  { label: 'Message', value: 'message' },
  { label: 'Author', value: 'author' },
  { label: 'Hash', value: 'hash' },
  { label: 'File', value: 'file' },
]

const displayCommits = computed(() => {
  if (isSearching.value) return repo.searchResults
  return activeOpenRepo.value?.commits ?? []
})

// ==================== Virtual Scroll ====================
const virtualItems = computed(() => createVirtualItems(displayCommits.value))

const {
  totalHeight,
  visibleItems,
  handleScroll: vsHandleScroll,
  updateContainerHeight,
} = useVirtualScroll(scrollContainer, virtualItems)

// ==================== GitGraph ====================
const graphWidth = ref(200)

function updateGraph() {
  if (!gitgraphEl.value) return
  const commits = displayCommits.value
  if (commits.length === 0) {
    gitgraphEl.value.innerHTML = ''
    return
  }
  renderCommitsToGitgraph(gitgraphEl.value, commits)
}

watch(displayCommits, () => {
  nextTick(() => updateGraph())
}, { deep: false })

// ==================== Infinite Scroll ====================
const loadingMore = ref(false)

async function loadMoreCommits() {
  if (!repo.activeRepoPath || loadingMore.value || !hasMore.value) return
  const lastCommit = displayCommits.value[displayCommits.value.length - 1]
  if (!lastCommit) return
  loadingMore.value = true
  try {
    await commitsStore.fetchLogs(repo.activeRepoPath, 50, lastCommit.id)
  } finally {
    loadingMore.value = false
  }
}

const { handleScroll: isHandleScroll } = useInfiniteScroll(scrollContainer, {
  threshold: 200,
  onLoadMore: loadMoreCommits,
  hasMore,
  loading: computed(() => loading.value || loadingMore.value),
})

// ==================== Search ====================
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

// ==================== Selection ====================
function selectCommit(commit: Commit) {
  if (repo.activeRepoPath) {
    commitsStore.selectCommit(repo.activeRepoPath, commit)
    rightPanel.showPanel('commit', commit.id)
  }
}

function onBranchClick(branchName: string) {
  if (repo.activeRepoPath) {
    commitsStore.filterByBranch(repo.activeRepoPath, branchName)
    activeBranchFilter.value = branchName
  }
}

function clearBranchFilter() {
  if (repo.activeRepoPath) {
    commitsStore.clearBranchFilter(repo.activeRepoPath)
    activeBranchFilter.value = null
  }
}

// ==================== Context Menu ====================
const contextMenu = reactive({
  visible: false,
  x: 0,
  y: 0,
  commit: null as Commit | null,
})

const SVG_PATHS: Record<string, string> = {
  cherry: 'M12 2a7 7 0 00-7 7c0 2.38 1.19 4.47 3 5.74V17a2 2 0 002 2h4a2 2 0 002-2v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 00-7-7zM9 21h6',
  rebase: 'M4 12h16m-4-4l4 4-4 4',
  branch: 'M6 3v12m0 0a3 3 0 100 6 3 3 0 000-6zm12-6a3 3 0 100 6 3 3 0 000-6zM6 9h12',
  tag: 'M20.59 13.41l-7.17-7.17a2 2 0 00-1.41-.59H5a2 2 0 00-2 2v6.83a2 2 0 00.59 1.41l7.17 7.17a2 2 0 002.83 0l7-7a2 2 0 000-2.83zM8 11a1 1 0 110-2 1 1 0 010 2z',
  copy: 'M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z',
}

function renderIcon(name: string) {
  return () => h('svg', {
    class: 'w-4 h-4',
    fill: 'none',
    stroke: 'currentColor',
    viewBox: '0 0 24 24',
    innerHTML: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${SVG_PATHS[name] ?? ''}"/>`,
  })
}

const contextMenuOptions = computed<DropdownOption[]>(() => [
  { key: 'cherry-pick', label: 'Cherry-pick this commit', icon: renderIcon('cherry') },
  { key: 'divider-1', type: 'divider' },
  { key: 'rebase', label: 'Rebase current branch onto this...', icon: renderIcon('rebase') },
  { key: 'reset-soft', label: 'Reset to this commit (Soft)' },
  { key: 'reset-mixed', label: 'Reset to this commit (Mixed)' },
  { key: 'reset-hard', label: 'Reset to this commit (Hard)', props: { style: 'color: var(--danger-color, #ef4444)' } },
  { key: 'divider-2', type: 'divider' },
  { key: 'create-branch', label: 'Create Branch here...', icon: renderIcon('branch') },
  { key: 'create-tag', label: 'Tag this version...', icon: renderIcon('tag') },
  { key: 'divider-3', type: 'divider' },
  { key: 'copy-sha', label: 'Copy SHA', icon: renderIcon('copy') },
])

function handleContextMenu(e: MouseEvent, commit: Commit) {
  e.preventDefault()
  contextMenu.visible = true
  contextMenu.x = e.clientX
  contextMenu.y = e.clientY
  contextMenu.commit = commit
}

function closeContextMenu() {
  contextMenu.visible = false
}

function handleMenuAction(key: string) {
  closeContextMenu()
  if (!contextMenu.commit) return
  switch (key) {
    case 'copy-sha':
      navigator.clipboard.writeText(contextMenu.commit.id)
      break
  }
}

// ==================== Time formatting ====================
function formatTime(timestamp?: number): string {
  if (!timestamp) return ''
  const date = new Date(timestamp * 1000)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHour < 24) return `${diffHour}h ago`
  if (diffDay < 30) return `${diffDay}d ago`
  return date.toLocaleDateString()
}

// ==================== Scroll handler ====================
function onScroll(e: Event) {
  vsHandleScroll(e)
  isHandleScroll()
}

// ==================== Lifecycle ====================
watch(() => repo.activeRepoPath, async (newPath) => {
  if (newPath) {
    const openRepo = repo.openRepos.get(newPath)
    if (openRepo && openRepo.commits.length === 0) {
      await commitsStore.fetchLogs(newPath)
    }
    invoke('start_watch', { repoPath: newPath })
    activeBranchFilter.value = null
  }
})

onMounted(() => {
  if (repo.activeRepoPath) {
    const openRepo = repo.openRepos.get(repo.activeRepoPath)
    if (openRepo && openRepo.commits.length === 0) {
      commitsStore.fetchLogs(repo.activeRepoPath)
    }
  }
  updateContainerHeight()
  window.addEventListener('resize', onResize)
  nextTick(() => updateGraph())
})

function onResize() {
  updateContainerHeight()
}

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  if (debounceTimer) clearTimeout(debounceTimer)
})
</script>

<style scoped>
.commit-list {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  border-right: 1px solid var(--border-color, #3c3c3c);
  background: var(--bg-primary, #1a1a1a);
}

.toolbar {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  gap: 8px;
  border-bottom: 1px solid var(--border-color, #3c3c3c);
  background: var(--bg-secondary, #252526);
  flex-shrink: 0;
}

.search-icon {
  width: 14px;
  height: 14px;
  color: var(--text-secondary, #969696);
  flex-shrink: 0;
}

.body {
  flex: 1;
  display: flex;
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
}

.body::-webkit-scrollbar {
  width: 8px;
}
.body::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 4px;
}
.body::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.25);
}

.graph-layer {
  flex-shrink: 0;
  position: sticky;
  left: 0;
  z-index: 1;
  background: var(--bg-primary, #1a1a1a);
}

.gitgraph-container {
  padding: 0 4px;
  min-height: 100%;
}

.gitgraph-container :deep(svg) {
  display: block;
}

.rows-layer {
  position: relative;
  flex: 1;
  min-width: 0;
}

.commit-row {
  height: 40px;
  display: flex;
  align-items: center;
  position: absolute;
  left: 0;
  right: 0;
  cursor: pointer;
  font-size: 12px;
  color: var(--text-primary, #e0e0e0);
  transition: background-color 0.15s ease;
}

.commit-row:hover {
  background: rgba(255, 255, 255, 0.05);
}

.commit-row.selected {
  background: rgba(56, 132, 255, 0.15);
}

.cell {
  padding: 0 8px;
  overflow: hidden;
  white-space: nowrap;
  flex-shrink: 0;
}

.cell-branch {
  display: flex;
  align-items: center;
  gap: 4px;
}

.cell-message {
  flex: 1;
  min-width: 0;
}

.cell-author {
  opacity: 0.85;
}

.cell-date {
  text-align: right;
  opacity: 0.65;
}

.msg-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ref-tag {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 10px;
  font-size: 10px;
  cursor: pointer;
  transition: opacity 0.15s;
}
.ref-tag:hover {
  opacity: 0.8;
}
.ref-tag.local {
  background: rgba(76, 175, 80, 0.2);
  color: #81c784;
}
.ref-tag.remote {
  background: rgba(33, 150, 243, 0.2);
  color: #64b5f6;
}
.ref-tag.tag {
  background: rgba(156, 39, 176, 0.2);
  color: #ba68c8;
}

.empty-state {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: var(--text-secondary, #969696);
  font-size: 13px;
}
</style>
```

- [ ] **Step 2: 更新 App.vue**

修改 `git-client/src/App.vue`:

```vue
<!-- 替换第 5 行和第 15 行 -->
<SourceTreeCommitList />
<!-- 改为 -->
<CommitList />
```

```typescript
/* 替换第 15 行 */
import SourceTreeCommitList from './components/commit/SourceTreeCommitList.vue'
/* 改为 */
import CommitList from './components/commit/CommitList.vue'
```

- [ ] **Step 3: Commit**

```bash
git add git-client/src/components/commit/CommitList.vue git-client/src/App.vue
git commit -m "feat: rewrite CommitList with @gitgraph.js integration"
```

---

## Task 4: 删除旧文件

**Files:**
- Delete: `git-client/src/components/commit/SourceTreeCommitList.vue`
- Delete: `git-client/src/components/commit/CommitList.vue` (旧版)
- Delete: `git-client/src/components/graph/GraphColumn.vue`
- Delete: `git-client/src/utils/graphLayout.ts`
- Delete: `git-client/src/components/commit/composables/useCommitGraph.ts`

- [ ] **Step 1: 删除旧文件**

```bash
rm git-client/src/components/commit/SourceTreeCommitList.vue
rm git-client/src/components/commit/CommitList.vue
rm git-client/src/components/graph/GraphColumn.vue
rmdir git-client/src/components/graph
rm git-client/src/utils/graphLayout.ts
rm git-client/src/components/commit/composables/useCommitGraph.ts
```

- [ ] **Step 2: 验证无残留引用**

Run: `cd git-client && npx vue-tsc --noEmit 2>&1 | head -30`
Expected: 无关于已删除文件的 import 错误（允许其他不相关的类型错误）

- [ ] **Step 3: Commit**

```bash
git add -A git-client/src/components/commit/SourceTreeCommitList.vue \
  git-client/src/components/commit/CommitList.vue \
  git-client/src/components/graph \
  git-client/src/utils/graphLayout.ts \
  git-client/src/components/commit/composables/useCommitGraph.ts
git commit -m "chore: remove old CommitList, SourceTreeCommitList, GraphColumn, graphLayout, useCommitGraph"
```

---

## Task 5: 构建验证与修复

- [ ] **Step 1: 运行类型检查**

Run: `cd git-client && npx vue-tsc --noEmit 2>&1`
Expected: 通过或仅有已知无关错误

- [ ] **Step 2: 运行构建**

Run: `cd git-client && npm run build 2>&1`
Expected: Vite 构建成功，无致命错误

- [ ] **Step 3: 修复类型/构建错误**

如有错误，逐个修复：
- 类型不匹配：调整类型注解
- 缺少导入：添加 import
- CSS 变量引用：确保与 themes/*.css 一致

- [ ] **Step 4: 运行测试**

Run: `cd git-client && npm test 2>&1`
Expected: 现有测试通过

- [ ] **Step 5: Commit（如有修复）**

```bash
git add -A
git commit -m "fix: resolve build errors after CommitList rewrite"
```

---

## Task 6: GitGraph 主题适配

- [ ] **Step 1: 在 gitgraphAdapter.ts 中注入深色主题配置**

在 `renderCommitsToGitgraph` 函数中，创建 Gitgraph 时传入自定义深色主题 template：

```typescript
import { createGitgraph, TemplateName, Orientation, Mode, templateExtend } from '@gitgraph/js'

function createDarkTemplate() {
  const base = templateExtend(TemplateName.SVGArrow, {
    colors: ['#4fc3f7', '#81c784', '#fff176', '#ff8a65', '#ba68c8', '#f06292', '#4db6ac', '#aed581'],
    branch: {
      lineWidth: 2,
      spacing: 20,
      label: {
        display: true,
        bgColor: '#2d2d2d',
        borderRadius: 4,
        font: '10px Arial',
      },
    },
    commit: {
      spacing: 52,
      dot: { size: 6, strokeWidth: 2 },
      message: {
        display: false,
      },
    },
  })
  return base
}
```

在 `renderCommitsToGitgraph` 中使用:
```typescript
const gitgraph = createGitgraph(container, {
  template: createDarkTemplate(),
  orientation: Orientation.VerticalReverse,
  mode: Mode.Compact,
})
```

- [ ] **Step 2: Commit**

```bash
git add git-client/src/utils/gitgraphAdapter.ts
git commit -m "style: apply dark theme to gitgraph rendering"
```

---

## Task 7: 最终集成测试

- [ ] **Step 1: 启动开发服务器验证**

Run: `cd git-client && npm run dev`
Expected: Vite dev server 启动成功，页面可访问

- [ ] **Step 2: 手动验证清单**
  - [ ] 打开一个 Git 仓库后，左侧显示 gitgraph 渲染的分支图
  - [ ] 右侧显示 commit 信息行（message/author/date）
  - [ ] 搜索框输入文字后触发搜索，结果正确显示
  - [ ] 过滤类型切换正常工作
  - [ ] 点击行高亮并打开右侧面板
  - [ ] 右键菜单弹出且选项可用
  - [ ] 滚动时 graph 和行保持同步
  - [ ] 滚到底部自动加载更多
  - [ ] 列头可拖拽调宽
  - [ ] 分支标签点击触发筛选
  - [ ] 深色主题下颜色正常

- [ ] **Step 3: 最终 Commit（如有微调）**

```bash
git add -A
git commit -m "polish: final adjustments for gitgraph-based CommitList"
```
