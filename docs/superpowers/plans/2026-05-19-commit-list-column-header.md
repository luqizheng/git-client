# Commit List 可配置列头实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Commit List 添加可配置的列头组件，支持调整列宽、显示/隐藏列，配置持久化到 localStorage。

**Architecture:** 新增 `useColumnConfig` composable 管理列配置状态与 localStorage 持久化，创建 `CommitListHeader.vue` 可配置列头组件，改造 `CommitGraph.vue` 支持动态列宽布局。

**Tech Stack:** Vue 3 Composition API, TypeScript, localStorage

---

## Task 1: 创建 useColumnConfig Composable

**Files:**
- Create: `git-client/src/components/commit/composables/useColumnConfig.ts`
- Test: `git-client/src/components/commit/composables/useColumnConfig.test.ts`

- [ ] **Step 1: 创建 useColumnConfig.ts**

```typescript
import { ref, computed, watch } from 'vue'
import { useRepoStore } from '../../../../stores/repo'

export interface ColumnConfig {
  id: string
  label: string
  visible: boolean
  width: number
  minWidth: number
  hideable: boolean
}

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'refs', label: 'Branch/Tag', visible: true, width: 120, minWidth: 80, hideable: true },
  { id: 'message', label: 'Message', visible: true, width: 300, minWidth: 200, hideable: false },
  { id: 'author', label: 'Author', visible: true, width: 100, minWidth: 60, hideable: true },
  { id: 'date', label: 'Date', visible: true, width: 80, minWidth: 60, hideable: true },
]

const STORAGE_KEY = 'commit-list-columns'

export function useColumnConfig() {
  const repoStore = useRepoStore()
  const columns = ref<ColumnConfig[]>([...DEFAULT_COLUMNS])

  const loadConfig = () => {
    if (!repoStore.activeRepoPath) {
      columns.value = [...DEFAULT_COLUMNS]
      return
    }
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const configs: Record<string, ColumnConfig[]> = JSON.parse(stored)
        const repoConfig = configs[repoStore.activeRepoPath]
        if (repoConfig) {
          columns.value = repoConfig.map(col => {
            const defaultCol = DEFAULT_COLUMNS.find(d => d.id === col.id)
            return defaultCol
              ? { ...defaultCol, visible: col.visible, width: col.width }
              : col
          })
          return
        }
      } catch (e) {
        console.warn('Failed to parse column config', e)
      }
    }
    columns.value = [...DEFAULT_COLUMNS]
  }

  const saveConfig = () => {
    if (!repoStore.activeRepoPath) return
    const stored = localStorage.getItem(STORAGE_KEY)
    const configs: Record<string, ColumnConfig[]> = stored ? JSON.parse(stored) : {}
    configs[repoStore.activeRepoPath] = columns.value
    localStorage.setItem(STORAGE_KEY, JSON.stringify(configs))
  }

  const setColumnWidth = (id: string, width: number) => {
    const col = columns.value.find(c => c.id === id)
    if (col && width >= col.minWidth) {
      col.width = width
      saveConfig()
    }
  }

  const toggleColumnVisibility = (id: string) => {
    const col = columns.value.find(c => c.id === id)
    if (col && col.hideable && col.visible) {
      const visibleCount = columns.value.filter(c => c.visible).length
      if (visibleCount > 1) {
        col.visible = false
        saveConfig()
      }
    }
  }

  const resetToDefault = () => {
    columns.value = [...DEFAULT_COLUMNS]
    saveConfig()
  }

  const visibleColumns = computed(() => columns.value.filter(c => c.visible))

  const columnStyles = computed(() => {
    const styles: Record<string, string> = {}
    for (const col of columns.value) {
      styles[col.id] = `width: ${col.width}px; min-width: ${col.minWidth}px; flex-shrink: 0;`
    }
    return styles
  })

  const visibleColumnIds = computed(() => visibleColumns.value.map(c => c.id))

  watch(() => repoStore.activeRepoPath, loadConfig, { immediate: true })

  return {
    columns,
    visibleColumns,
    columnStyles,
    visibleColumnIds,
    setColumnWidth,
    toggleColumnVisibility,
    resetToDefault,
    loadConfig,
  }
}
```

- [ ] **Step 2: 创建 useColumnConfig.test.ts**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useColumnConfig } from './useColumnConfig'

vi.mock('../../../../stores/repo', () => ({
  useRepoStore: () => ({
    activeRepoPath: '/test/repo',
  }),
}))

describe('useColumnConfig', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('should return default columns', () => {
    const { columns } = useColumnConfig()
    expect(columns.value).toHaveLength(4)
    expect(columns.value.find(c => c.id === 'message')?.hideable).toBe(false)
  })

  it('should persist column width to localStorage', () => {
    const { setColumnWidth } = useColumnConfig()
    setColumnWidth('author', 150)
    const stored = localStorage.getItem('commit-list-columns')
    expect(stored).toBeTruthy()
  })

  it('should not allow width below minWidth', () => {
    const { columns, setColumnWidth } = useColumnConfig()
    const originalWidth = columns.value.find(c => c.id === 'author')!.width
    setColumnWidth('author', 10)
    expect(columns.value.find(c => c.id === 'author')!.width).toBe(originalWidth)
  })
})
```

- [ ] **Step 3: 运行测试验证**

Run: `cd git-client && npm run test -- --run src/components/commit/composables/useColumnConfig.test.ts`
Expected: PASS

- [ ] **Step 4: 提交**

```bash
git add git-client/src/components/commit/composables/useColumnConfig.ts git-client/src/components/commit/composables/useColumnConfig.test.ts
git commit -m "feat(commit-list): add useColumnConfig composable"
```

---

## Task 2: 创建 CommitListHeader 组件

**Files:**
- Create: `git-client/src/components/commit/CommitListHeader.vue`

- [ ] **Step 1: 创建 CommitListHeader.vue**

```vue
<script setup lang="ts">
import { ref } from 'vue'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useColumnConfig } from './composables/useColumnConfig'

const { visibleColumns, columnStyles, toggleColumnVisibility, resetToDefault } = useColumnConfig()

const resizing = ref<string | null>(null)
const startX = ref(0)
const startWidth = ref(0)

function startResize(e: MouseEvent, columnId: string, currentWidth: number) {
  e.preventDefault()
  resizing.value = columnId
  startX.value = e.clientX
  startWidth.value = currentWidth
  document.addEventListener('mousemove', onResize)
  document.addEventListener('mouseup', stopResize)
}

function onResize(e: MouseEvent) {
  if (!resizing.value) return
  const delta = e.clientX - startX.value
  const { setColumnWidth, columns } = useColumnConfig()
  const newWidth = startWidth.value + delta
  setColumnWidth(resizing.value, newWidth)
}

function stopResize() {
  resizing.value = null
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
}
</script>

<template>
  <div class="commit-list-header">
    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <div class="header-trigger">Columns</div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuCheckboxItem
          v-for="col in visibleColumns"
          :key="col.id"
          :checked="col.visible"
          @update:checked="toggleColumnVisibility(col.id)"
          @click.stop
        >
          {{ col.label }}
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem @click="resetToDefault">
          Reset to Default
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    <div class="header-columns">
      <template v-for="col in visibleColumns" :key="col.id">
        <div
          class="header-cell"
          :style="columnStyles[col.id]"
          @contextmenu.prevent
        >
          <span class="header-label">{{ col.label }}</span>
          <div
            v-if="col.hideable"
            class="resize-handle"
            @mousedown="startResize($event, col.id, col.width)"
          />
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.commit-list-header {
  display: flex;
  align-items: stretch;
  height: 32px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-secondary);
  user-select: none;
}

.header-trigger {
  display: flex;
  align-items: center;
  padding: 0 12px;
  font-size: 11px;
  color: var(--muted-foreground);
  cursor: pointer;
  border-right: 1px solid var(--border);
}

.header-trigger:hover {
  background: var(--bg-hover);
}

.header-columns {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.header-cell {
  display: flex;
  align-items: center;
  padding: 0 8px;
  font-size: 11px;
  font-weight: 600;
  color: var(--foreground);
  position: relative;
}

.header-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.resize-handle {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 6px;
  cursor: col-resize;
}

.resize-handle:hover {
  background: var(--accent-primary);
  opacity: 0.5;
}
</style>
```

- [ ] **Step 2: 提交**

```bash
git add git-client/src/components/commit/CommitListHeader.vue
git commit -m "feat(commit-list): add CommitListHeader component"
```

---

## Task 3: 修改 CommitGraph 支持动态列宽

**Files:**
- Modify: `git-client/src/components/graph/CommitGraph.vue:288-296`

- [ ] **Step 1: 修改 row-info 样式支持动态列宽**

定位到 `.row-info` 样式块，替换为：

```css
.row-info {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 0;
  padding-right: 0;
  overflow: hidden;
}
```

- [ ] **Step 2: 添加列内容布局样式**

在 `<style scoped>` 中添加：

```css
.row-refs,
.row-message,
.row-author,
.row-date {
  display: flex;
  align-items: center;
  padding: 0 8px;
  overflow: hidden;
  height: 100%;
}

.row-refs {
  flex-shrink: 0;
}

.row-message {
  flex: 1;
  min-width: 200px;
}

.row-author {
  flex-shrink: 0;
  max-width: 120px;
}

.row-date {
  flex-shrink: 0;
  min-width: 60px;
  justify-content: flex-end;
}
```

- [ ] **Step 3: 修改模板使用列布局**

定位到 commit-row 中的 `div.row-info`，替换内容：

```vue
<div class="row-info">
  <div class="row-refs">
    <div class="ref-tags">
      <span
        v-for="ref in item.row.commit.refs"
        :key="ref.name"
        class="ref-tag"
        :class="getRefClass(ref)"
      >{{ getRefDisplayName(ref) }}</span>
    </div>
  </div>
  <div class="row-message">
    <span class="commit-message">{{ getFirstLine(item.row.commit.message) }}</span>
  </div>
  <div class="row-author">
    <span class="commit-author">{{ item.row.commit.author }}</span>
  </div>
  <div class="row-date">
    <span class="commit-time">{{ formatRelativeTime(item.row.commit.time) }}</span>
  </div>
</div>
```

- [ ] **Step 4: 添加 CSS 变量注入**

在 `CommitGraph.vue` 中添加 props：

```ts
const props = defineProps<{
  // ... existing props
  columnStyles?: Record<string, string>
}>()
```

在 row-info 上绑定样式：

```vue
<div class="row-info" :style="columnStyles">
```

- [ ] **Step 5: 提交**

```bash
git add git-client/src/components/graph/CommitGraph.vue
git commit -m "refactor(commit-graph): support dynamic column widths"
```

---

## Task 4: 集成到 commit-list.vue

**Files:**
- Modify: `git-client/src/components/commit/components/commit-list/commit-list.vue`

- [ ] **Step 1: 导入并使用 useColumnConfig**

在 `<script setup>` 中添加：

```ts
import { useColumnConfig } from '../../composables/useColumnConfig'

// ... existing code

const { columnStyles, visibleColumnIds } = useColumnConfig()
```

- [ ] **Step 2: 导入 CommitListHeader**

```ts
import CommitListHeader from '../../CommitListHeader.vue'
```

- [ ] **Step 3: 在模板中添加列头**

在 `<CommitGraph>` 前添加：

```vue
<CommitListHeader />
```

- [ ] **Step 4: 传递 columnStyles 给 CommitGraph**

```vue
<CommitGraph
  :commits="graphCommits"
  :selected-commit-id="selectedCommitId"
  :has-wip="hasWip"
  :wip-unstaged-count="wipUnstagedCount"
  :wip-staged-count="wipStagedCount"
  :column-styles="columnStyles"
  @commit-click="onCommitClick"
  @wip-click="onWipClick"
  @context-menu="onContextMenu"
/>
```

- [ ] **Step 5: 提交**

```bash
git add git-client/src/components/commit/components/commit-list/commit-list.vue
git commit -m "feat(commit-list): integrate configurable column header"
```

---

## Task 5: 联调测试

- [ ] **Step 1: 启动开发服务器**

Run: `cd git-client && npm run dev:git-client`

- [ ] **Step 2: 验证功能**

- [ ] 列头固定显示，右侧有 Columns 按钮
- [ ] 拖拽列分隔线可调整宽度
- [ ] 点击 Columns 按钮可显示/隐藏列
- [ ] 刷新页面后配置保留
- [ ] 不同仓库配置独立

- [ ] **Step 3: 运行测试**

Run: `cd git-client && npm run test -- --run src/components/commit/`
Expected: All tests pass

- [ ] **Step 4: 提交**

```bash
git add -A
git commit -m "test(commit-list): add integration tests for column config"
```
