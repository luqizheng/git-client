# Task 2: SourceTreeCommitList 主容器 + ColumnHeader

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** 创建 SourceTreeCommitList.vue 主容器和 ColumnHeader.vue 列头组件，集成虚拟滚动和列宽调整

**Architecture:** 主容器管理整体布局、滚动、状态协调。ColumnHeader 支持拖拽调整列宽和固定列定位

**Tech Stack:** Vue 3, TypeScript, Naive UI

**Depends:** Task 1（composables）

---

**Files:**
- Create: `src/components/commit/SourceTreeCommitList.vue`
- Create: `src/components/commit/components/ColumnHeader.vue`

- [ ] **Step 1: 创建 ColumnHeader.vue**

```vue
<template>
  <div class="column-header">
    <div
      v-for="col in visibleColumns"
      :key="col.key"
      class="column-header-cell"
      :class="{ 'fixed-left': col.fixed === 'left', 'fixed-right': col.fixed === 'right' }"
      :style="{ width: col.width + 'px', minWidth: col.width + 'px', maxWidth: col.width + 'px' }"
    >
      <span class="column-label">{{ col.label }}</span>
      <div
        class="resize-handle"
        @mousedown.stop.prevent="startResize($event, col.key)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ColumnConfig } from '../composables/useResizableColumns'

const props = defineProps<{
  columns: ColumnConfig[]
}>()

const emit = defineEmits<{
  resize: [columnKey: string, delta: number]
}>()

const visibleColumns = computed(() => props.columns.filter(c => c.visible))

let resizingKey: string | null = null
let startX = 0
let startWidth = 0

function startResize(e: MouseEvent, key: string) {
  resizingKey = key
  startX = e.clientX
  startWidth = props.columns.find(c => c.key === key)?.width ?? 100

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

function onMouseMove(e: MouseEvent) {
  if (!resizingKey) return
  const delta = e.clientX - startX
  emit('resize', resizingKey, delta)
  startX = e.clientX
  startWidth = (props.columns.find(c => c.key === resizingKey)?.width ?? 100)
}

function onMouseUp() {
  resizingKey = null
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
}

import { computed } from 'vue'
</script>

<style scoped>
.column-header {
  display: flex;
  height: 32px;
  background: var(--bg-secondary, #252526);
  border-bottom: 1px solid var(--border-color, #3c3c3c);
  user-select: none;
}

.column-header-cell {
  padding: 0 8px;
  display: flex;
  align-items: center;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary, #969696);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  position: relative;
  flex-shrink: 0;
  background: var(--bg-secondary, #252526);
}

.column-header-cell.fixed-left {
  position: sticky;
  left: 0;
  z-index: 3;
}

.column-header-cell.fixed-right {
  position: sticky;
  right: 0;
  z-index: 3;
}

.column-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.resize-handle {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  cursor: col-resize;
  opacity: 0;
  transition: opacity 0.15s;
}

.column-header-cell:hover .resize-handle {
  opacity: 1;
  background: var(--accent-color, #0078d4);
}
</style>
```

- [ ] **Step 2: 创建 SourceTreeCommitList.vue 主容器**

```vue
<template>
  <div class="source-tree-commit-list">
    <div class="toolbar">
      <button class="toolbar-btn" @click="$emit('show-all')">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
        </svg>
        Show All
      </button>
    </div>

    <ColumnHeader
      :columns="columns"
      @resize="resizeColumn"
    />

    <div
      ref="scrollContainer"
      class="scroll-container"
      @scroll="handleScroll"
    >
      <div
        class="scroll-content"
        :style="{ height: totalHeight + 'px', position: 'relative', '--col-branch-width': getColumnWidth('branch') + 'px' }"
      >
        <template v-for="item in visibleItems" :key="item.type === 'commit' ? item.commit.id : item.group.key">
          <TimeGroupHeader
            v-if="item.type === 'group'"
            :group="item.group"
            :style="{ transform: `translateY(${item.offset}px)` }"
          />
          <CommitRow
            v-else
            :commit="item.commit"
            :columns="columns"
            :selected="item.commit.id === selectedCommitId"
            :is-drag-over="dragState.isDragging && dragState.targetCommit?.id === item.commit.id"
            :style="{ transform: `translateY(${item.offset}px)` }"
            @click="$emit('select', item.commit)"
            @contextmenu="handleContextMenu($event, item.commit)"
            @dragover="onDragOver(item.commit)"
            @dragleave="onDragLeave"
          />
        </template>
      </div>
    </div>

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
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { NDropdown } from 'naive-ui'
import type { DropdownOption } from 'naive-ui'
import type { Commit, CommitRef } from '../../types/git'
import { useCommitsStore } from '../../stores/commits'
import { useRepoStore } from '../../stores/repo'
import { useRightPanelStore } from '../../stores/rightPanel'
import { invoke } from '../../utils/ipc'
import { useResizableColumns } from '../composables/useResizableColumns'
import { useVirtualScroll, createVirtualItems } from '../composables/useVirtualScroll'
import { useDragDrop } from '../composables/useDragDrop'
import { useTimeGrouping } from '../composables/useTimeGrouping'
import ColumnHeader from './components/ColumnHeader.vue'
import TimeGroupHeader from './components/TimeGroupHeader.vue'
import CommitRow from './components/CommitRow.vue'

const repo = useRepoStore()
const commits = useCommitsStore()
const rightPanel = useRightPanelStore()

const { columns, resizeColumn, getColumnWidth } = useResizableColumns()
const scrollContainer = ref<HTMLElement | null>(null)

const activeOpenRepo = computed(() => repo.activeRepo)
const selectedCommitId = computed(() => activeOpenRepo.value?.selectedCommit?.id ?? null)
const displayCommits = computed(() => activeOpenRepo.value?.commits ?? [])

const { groups } = useTimeGrouping(displayCommits)
const virtualItems = computed(() => createVirtualItems(displayCommits.value, groups.value))

const {
  totalHeight,
  visibleItems,
  handleScroll,
  updateContainerHeight,
} = useVirtualScroll(scrollContainer, virtualItems)

const { dragState, onDragOver, onDragLeave, onDrop } = useDragDrop()

const contextMenu = reactive({
  visible: false,
  x: 0,
  y: 0,
  commit: null as Commit | null,
})

import { reactive, h } from 'vue'

const contextMenuOptions = computed<DropdownOption[]>(() => [
  { key: 'cherry-pick', label: 'Cherry-pick this commit' },
  { key: 'divider-1', type: 'divider' },
  { key: 'rebase', label: 'Rebase current branch onto this...' },
  { key: 'reset-soft', label: 'Reset to this commit (Soft)' },
  { key: 'reset-mixed', label: 'Reset to this commit (Mixed)' },
  { key: 'reset-hard', label: 'Reset to this commit (Hard)', props: { style: 'color: var(--danger-color, #ef4444)' } },
  { key: 'divider-2', type: 'divider' },
  { key: 'create-branch', label: 'Create Branch here...' },
  { key: 'create-tag', label: 'Tag this version...' },
  { key: 'divider-3', type: 'divider' },
  { key: 'copy-sha', label: 'Copy SHA' },
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
    case 'cherry-pick': emit('cherry-pick', contextMenu.commit.id); break
    case 'rebase': break
    case 'reset-soft': emit('reset', contextMenu.commit.id, 'soft'); break
    case 'reset-mixed': emit('reset', contextMenu.commit.id, 'mixed'); break
    case 'reset-hard': emit('reset', contextMenu.commit.id, 'hard'); break
    case 'copy-sha': navigator.clipboard.writeText(contextMenu.commit.id); break
  }
}

const emit = defineEmits<{
  select: [commit: Commit]
  'cherry-pick': [commitId: string]
  rebase: [branch: string, onto: string]
  reset: [commitId: string, mode: string]
  'solo-branch': [branchName: string]
  'hide-branch': [branchName: string]
  'show-all': []
}>()

let observer: IntersectionObserver | null = null

function setupObserver() {
  observer?.disconnect()
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
  updateContainerHeight()
  setupObserver()
})

onUnmounted(() => {
  observer?.disconnect()
})
</script>

<style scoped>
.source-tree-commit-list {
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
}

.toolbar-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  font-size: 11px;
  color: var(--text-secondary, #969696);
  background: transparent;
  border: 1px solid var(--border-color, #3c3c3c);
  border-radius: 3px;
  cursor: pointer;
}

.toolbar-btn:hover {
  color: var(--text-primary, #e0e0e0);
  background: rgba(255, 255, 255, 0.05);
}

.scroll-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
}

.scroll-container::-webkit-scrollbar {
  width: 8px;
}

.scroll-container::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 4px;
}

.scroll-container::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.25);
}
</style>
```

- [ ] **Step 3: 验证构建**

Run: `cd d:\projects\req2task-2\git-client; npx vite build`

Expected: 成功（TimeGroupHeader 和 CommitRow 组件尚未创建，先创建占位）

- [ ] **Step 4: 创建 CommitRow 和 TimeGroupHeader 占位组件**

CommitRow 占位：
```vue
<template>
  <div class="commit-row" :style="{ transform: `translateY(0)` }">
    <span class="text-xs text-gray-500">Commit row placeholder</span>
  </div>
</template>
<script setup lang="ts">
import type { Commit } from '../../../types/git'
import type { ColumnConfig } from '../composables/useResizableColumns'
defineProps<{ commit: Commit; columns: ColumnConfig[]; selected: boolean; isDragOver: boolean }>()
</script>
<style scoped>
.commit-row { height: 40px; display: flex; align-items: center; position: absolute; left: 0; right: 0; }
</style>
```

TimeGroupHeader 占位：
```vue
<template>
  <div class="time-group-header">
    <span class="group-label">{{ group.label }}</span>
  </div>
</template>
<script setup lang="ts">
import type { TimeGroup } from '../composables/useVirtualScroll'
defineProps<{ group: TimeGroup }>()
</script>
<style scoped>
.time-group-header { height: 28px; position: absolute; left: 0; right: 0; display: flex; align-items: center; padding: 0 12px; background: rgba(255,255,255,0.03); border-top: 1px solid #3c3c3c; border-bottom: 1px solid #3c3c3c; }
.group-label { font-size: 12px; font-weight: 600; color: #e0e0e0; }
</style>
```

- [ ] **Step 5: 验证构建**

Run: `cd d:\projects\req2task-2\git-client; npx vite build`

Expected: 成功

- [ ] **Step 6: Commit**

```bash
git add src/components/commit/SourceTreeCommitList.vue src/components/commit/components/
git commit -m "feat: add SourceTreeCommitList main container and ColumnHeader"
```
