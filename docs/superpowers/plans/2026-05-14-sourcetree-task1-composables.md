# Task 1: Composables 基础

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** 创建 4 个 composable 函数：useResizableColumns、useVirtualScroll、useDragDrop、useTimeGrouping

**Architecture:** 所有 composable 放在 `src/components/commit/composables/` 目录下，纯逻辑无 UI

**Tech Stack:** Vue 3 Composition API, TypeScript

**Depends:** Task 0（CommitRef 类型）

---

**Files:**
- Create: `src/components/commit/composables/useResizableColumns.ts`
- Create: `src/components/commit/composables/useVirtualScroll.ts`
- Create: `src/components/commit/composables/useDragDrop.ts`
- Create: `src/components/commit/composables/useTimeGrouping.ts`

- [ ] **Step 1: 创建 useResizableColumns.ts**

```typescript
import { ref } from 'vue'

export interface ColumnConfig {
  key: string
  label: string
  width: number
  minWidth: number
  maxWidth: number
  visible: boolean
  fixed?: 'left' | 'right'
}

const STORAGE_KEY = 'sourcetree-commit-list-columns'

function getDefaultColumns(): ColumnConfig[] {
  return [
    { key: 'branch', label: 'BRANCH / TAG', width: 140, minWidth: 80, maxWidth: 250, visible: true, fixed: 'left' },
    { key: 'graph', label: 'GRAPH', width: 120, minWidth: 80, maxWidth: 200, visible: true },
    { key: 'message', label: 'COMMIT MESSAGE', width: 300, minWidth: 200, maxWidth: 600, visible: true },
    { key: 'author', label: 'AUTHOR', width: 100, minWidth: 60, maxWidth: 150, visible: true, fixed: 'right' },
    { key: 'date', label: 'DATE / TIME', width: 150, minWidth: 120, maxWidth: 200, visible: true, fixed: 'right' },
  ]
}

function loadFromStorage(): ColumnConfig[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch {}
  return getDefaultColumns()
}

function saveToStorage(columns: ColumnConfig[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(columns))
  } catch {}
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function useResizableColumns() {
  const columns = ref<ColumnConfig[]>(loadFromStorage())

  function resizeColumn(key: string, delta: number) {
    const col = columns.value.find(c => c.key === key)
    if (!col) return
    col.width = clamp(col.width + delta, col.minWidth, col.maxWidth)
    saveToStorage(columns.value)
  }

  function resetColumns() {
    columns.value = getDefaultColumns()
    saveToStorage(columns.value)
  }

  function getColumnWidth(key: string): number {
    return columns.value.find(c => c.key === key)?.width ?? 100
  }

  function getTotalWidth(): number {
    return columns.value.filter(c => c.visible).reduce((sum, c) => sum + c.width, 0)
  }

  return { columns, resizeColumn, resetColumns, getColumnWidth, getTotalWidth }
}
```

- [ ] **Step 2: 创建 useVirtualScroll.ts**

```typescript
import { ref, computed, type Ref } from 'vue'
import type { Commit } from '../../../types/git'

export interface TimeGroup {
  key: string
  label: string
  count: number
  firstCommitIndex: number
}

export type VirtualItem =
  | { type: 'commit'; commit: Commit; height: 40 }
  | { type: 'group'; group: TimeGroup; height: 28 }

const COMMIT_ROW_HEIGHT = 40
const GROUP_HEADER_HEIGHT = 28

export function createVirtualItems(commits: Commit[], groups: TimeGroup[]): VirtualItem[] {
  const items: VirtualItem[] = []
  let groupIdx = 0
  for (let i = 0; i < commits.length; i++) {
    if (groupIdx < groups.length && groups[groupIdx].firstCommitIndex === i) {
      items.push({ type: 'group', group: groups[groupIdx], height: GROUP_HEADER_HEIGHT })
      groupIdx++
    }
    items.push({ type: 'commit', commit: commits[i], height: COMMIT_ROW_HEIGHT })
  }
  return items
}

export function useVirtualScroll(
  containerRef: Ref<HTMLElement | null>,
  items: Ref<VirtualItem[]>,
) {
  const scrollTop = ref(0)
  const containerHeight = ref(600)
  const BUFFER_PX = 200

  const offsetMap = computed(() => {
    const map: number[] = []
    let acc = 0
    for (const item of items.value) {
      map.push(acc)
      acc += item.height
    }
    return map
  })

  const totalHeight = computed(() => {
    if (offsetMap.value.length === 0) return 0
    const lastIdx = items.value.length - 1
    return offsetMap.value[lastIdx] + (items.value[lastIdx]?.height ?? 0)
  })

  const visibleRange = computed(() => {
    const top = scrollTop.value - BUFFER_PX
    const bottom = scrollTop.value + containerHeight.value + BUFFER_PX
    const map = offsetMap.value
    let start = 0
    let end = items.value.length - 1

    for (let i = 0; i < map.length; i++) {
      if (map[i] + items.value[i].height >= top) { start = i; break }
    }
    for (let i = map.length - 1; i >= 0; i--) {
      if (map[i] <= bottom) { end = i; break }
    }

    return { start: Math.max(0, start), end: Math.min(items.value.length - 1, end) }
  })

  const visibleItems = computed(() => {
    const { start, end } = visibleRange.value
    return items.value.slice(start, end + 1).map((item, i) => ({
      ...item,
      offset: offsetMap.value[start + i],
    }))
  })

  function handleScroll(e: Event) {
    scrollTop.value = (e.target as HTMLElement).scrollTop
  }

  function updateContainerHeight() {
    if (containerRef.value) {
      containerHeight.value = containerRef.value.clientHeight
    }
  }

  function scrollToOffset(offset: number) {
    if (containerRef.value) {
      containerRef.value.scrollTop = offset
    }
  }

  return {
    scrollTop,
    containerHeight,
    visibleRange,
    visibleItems,
    totalHeight,
    offsetMap,
    handleScroll,
    updateContainerHeight,
    scrollToOffset,
  }
}
```

- [ ] **Step 3: 创建 useDragDrop.ts**

```typescript
import { reactive } from 'vue'
import type { Commit, CommitRef } from '../../../types/git'

export interface DragSource {
  branchName: string
  branchType: 'local' | 'remote'
}

export interface DragDropResult {
  source: DragSource
  targetCommit: Commit
}

export function useDragDrop() {
  const dragState = reactive({
    isDragging: false,
    source: null as DragSource | null,
    targetCommit: null as Commit | null,
  })

  function onDragStart(source: DragSource) {
    dragState.isDragging = true
    dragState.source = source
  }

  function onDragOver(commit: Commit) {
    if (dragState.isDragging) {
      dragState.targetCommit = commit
    }
  }

  function onDragLeave() {
    dragState.targetCommit = null
  }

  function onDrop(): DragDropResult | null {
    if (!dragState.isDragging || !dragState.source || !dragState.targetCommit) return null

    const result: DragDropResult = {
      source: dragState.source,
      targetCommit: dragState.targetCommit,
    }

    reset()
    return result
  }

  function reset() {
    dragState.isDragging = false
    dragState.source = null
    dragState.targetCommit = null
  }

  return { dragState, onDragStart, onDragOver, onDragLeave, onDrop, reset }
}
```

- [ ] **Step 4: 创建 useTimeGrouping.ts**

```typescript
import { computed, type Ref } from 'vue'
import type { Commit } from '../../../types/git'
import type { TimeGroup } from './useVirtualScroll'

function getTimeGroup(timestamp: number): { key: string; label: string } {
  const now = new Date()
  const date = new Date(timestamp * 1000)
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000)

  if (diffDays === 0) return { key: 'today', label: 'Today' }
  if (diffDays === 1) return { key: 'yesterday', label: 'Yesterday' }
  if (diffDays < 7) return { key: 'this-week', label: 'This Week' }
  if (diffDays < 30) return { key: 'this-month', label: 'This Month' }
  return { key: 'older', label: 'Older' }
}

export function useTimeGrouping(commits: Ref<Commit[]>) {
  const groups = computed<TimeGroup[]>(() => {
    const result: TimeGroup[] = []
    let lastKey = ''

    for (let i = 0; i < commits.value.length; i++) {
      const commit = commits.value[i]
      const { key, label } = getTimeGroup(commit.time)

      if (key !== lastKey) {
        result.push({ key, label, count: 1, firstCommitIndex: i })
        lastKey = key
      } else {
        result[result.length - 1].count++
      }
    }

    return result
  })

  return { groups }
}
```

- [ ] **Step 5: 验证构建**

Run: `cd d:\projects\req2task-2\git-client; npx vite build`

Expected: 成功

- [ ] **Step 6: Commit**

```bash
git add src/components/commit/composables/
git commit -m "feat: add composables for SourceTree commit list"
```
