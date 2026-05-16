# CommitList 简单实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现简洁的 Commit 列表，四列布局（Hash/Message/Author/Date），全文搜索，无限滚动，右键菜单（图标+文字）。无 graph 图形。

**Architecture:** 组件化方案：主容器 `commit-list.vue` + 4 个 Cell 组件 + ContextMenu 组件 + 3 个 composables。沿用现有 Pinia stores (commits, repo) 获取数据。

**Tech Stack:** Vue 3 + Naive UI (NDropdown) + UnoCSS + Pinia + @tanstack/vue-virtual

**Depends:** commitHelpers.ts 工具函数（已存在），commitsStore / repoStore（已存在），@tanstack/vue-virtual（已安装 v3.13.24）

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `src/components/commit/composables/useFilter.ts` | 全文搜索过滤 |
| `src/components/commit/composables/useInfiniteScroll.ts` | 滚动到底部自动加载 |
| `src/components/commit/composables/useCommitList.ts` | 主编排 composable |
| `src/components/commit/components/cells/HashCell.vue` | SHA 缩略显示 |
| `src/components/commit/components/cells/MessageCell.vue` | 消息（搜索高亮） |
| `src/components/commit/components/cells/AuthorCell.vue` | 作者名 |
| `src/components/commit/components/cells/DateCell.vue` | 相对时间 |

### Modified Files

| File | Change |
|------|--------|
| `src/components/commit/components/commit-list/commit-list.vue` | 完全重写为简洁版本 |

### Test Files

| File | Tests |
|------|-------|
| `src/components/commit/composables/useFilter.test.ts` | 过滤逻辑测试 |
| `src/components/commit/composables/useInfiniteScroll.test.ts` | 无限滚动测试 |

---

### Task 1: useFilter Composable

**Files:**
- Create: `src/components/commit/composables/useFilter.ts`
- Create: `src/components/commit/composables/useFilter.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/components/commit/composables/useFilter.test.ts
import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useFilter } from './useFilter'
import type { Commit } from '../../../types/git'

const makeCommit = (overrides: Partial<Commit> = {}): Commit => ({
  id: 'abc123',
  message: 'test message',
  author: 'Test Author',
  author_email: 'test@test.com',
  time: 1000000,
  parent_ids: [],
  refs: [],
  ...overrides,
})

describe('useFilter', () => {
  it('returns all commits when filter is empty', () => {
    const commits = ref([makeCommit(), makeCommit({ id: 'def456' })])
    const { filteredCommits } = useFilter(commits)
    expect(filteredCommits.value).toHaveLength(2)
  })

  it('filters by message (case-insensitive)', () => {
    const commits = ref([
      makeCommit({ message: 'feat: login' }),
      makeCommit({ id: 'def456', message: 'fix: bug' }),
    ])
    const { filteredCommits, filterText } = useFilter(commits)
    filterText.value = 'login'
    expect(filteredCommits.value).toHaveLength(1)
    expect(filteredCommits.value[0].message).toBe('feat: login')
  })

  it('filters by author', () => {
    const commits = ref([
      makeCommit({ author: 'Alice' }),
      makeCommit({ id: 'def456', author: 'Bob' }),
    ])
    const { filteredCommits, filterText } = useFilter(commits)
    filterText.value = 'alice'
    expect(filteredCommits.value).toHaveLength(1)
  })

  it('filters by author_email', () => {
    const commits = ref([
      makeCommit({ author_email: 'alice@a.com' }),
      makeCommit({ id: 'def456', author_email: 'bob@b.com' }),
    ])
    const { filteredCommits, filterText } = useFilter(commits)
    filterText.value = 'alice@'
    expect(filteredCommits.value).toHaveLength(1)
  })

  it('filters by hash prefix', () => {
    const commits = ref([
      makeCommit({ id: 'abc123def' }),
      makeCommit({ id: 'xyz789ghi' }),
    ])
    const { filteredCommits, filterText } = useFilter(commits)
    filterText.value = 'abc'
    expect(filteredCommits.value).toHaveLength(1)
  })

  it('returns empty when no match', () => {
    const commits = ref([makeCommit()])
    const { filteredCommits, filterText } = useFilter(commits)
    filterText.value = 'nonexistent'
    expect(filteredCommits.value).toHaveLength(0)
  })

  it('trims whitespace from filter text', () => {
    const commits = ref([makeCommit({ message: 'hello' })])
    const { filteredCommits, filterText } = useFilter(commits)
    filterText.value = '  hello  '
    expect(filteredCommits.value).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```powershell
cd git-client; npx vitest run src/components/commit/composables/useFilter.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Implement useFilter**

```typescript
// src/components/commit/composables/useFilter.ts
import { ref, computed, type Ref } from 'vue'
import type { Commit } from '../../../types/git'
import { matchesFilter } from '../utils/commitHelpers'

export function useFilter(commits: Ref<Commit[]>) {
  const filterText = ref('')

  const filteredCommits = computed(() => {
    const q = filterText.value.trim()
    if (!q) return commits.value
    return commits.value.filter(c =>
      matchesFilter(c, q, 'all'),
    )
  })

  return {
    filterText,
    filteredCommits,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```powershell
cd git-client; npx vitest run src/components/commit/composables/useFilter.test.ts
```

Expected: All tests PASS

- [ ] **Step 5: Commit**

```powershell
git add src/components/commit/composables/useFilter.ts src/components/commit/composables/useFilter.test.ts
git commit -m "feat: add useFilter composable with tests"
```

---

### Task 2: useInfiniteScroll Composable

**Files:**
- Create: `src/components/commit/composables/useInfiniteScroll.ts`

- [ ] **Step 1: Implement useInfiniteScroll**

```typescript
// src/components/commit/composables/useInfiniteScroll.ts
import { type Ref } from 'vue'

export function useInfiniteScroll(
  scrollContainer: Ref<HTMLElement | null>,
  options: {
    threshold: number
    onLoadMore: () => void
  },
) {
  function onScroll() {
    const el = scrollContainer.value
    if (!el) return
    const { scrollTop, scrollHeight, clientHeight } = el
    if (scrollHeight - scrollTop - clientHeight < options.threshold) {
      options.onLoadMore()
    }
  }

  return { onScroll }
}
```

- [ ] **Step 2: Commit**

```powershell
git add src/components/commit/composables/useInfiniteScroll.ts
git commit -m "feat: add useInfiniteScroll composable"
```

---

### Task 3: Cell Components

**Files:**
- Create: `src/components/commit/components/cells/HashCell.vue`
- Create: `src/components/commit/components/cells/MessageCell.vue`
- Create: `src/components/commit/components/cells/AuthorCell.vue`
- Create: `src/components/commit/components/cells/DateCell.vue`

- [ ] **Step 1: Create HashCell.vue**

```vue
<!-- src/components/commit/components/cells/HashCell.vue -->
<script setup lang="ts">
defineProps<{ hash: string }>()
</script>

<template>
  <span class="hash-cell font-mono text-xs text-[var(--commit-text-secondary)] select-all">{{ hash.slice(0, 7) }}</span>
</template>
```

- [ ] **Step 2: Create MessageCell.vue**

```vue
<!-- src/components/commit/components/cells/MessageCell.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { getFirstLine, highlightText } from '../../utils/commitHelpers'

const props = defineProps<{
  message: string
  query?: string
}>()

const parts = computed(() => highlightText(getFirstLine(props.message), props.query ?? ''))
</script>

<template>
  <span class="message-cell truncate text-sm leading-[40px]">
    <template v-for="(part, i) in parts" :key="i">
      <mark v-if="part.isHighlight" class="highlight bg-yellow-500/30 text-yellow-300 rounded px-0.5">{{ part.text }}</mark>
      <span v-else>{{ part.text }}</span>
    </template>
  </span>
</template>
```

- [ ] **Step 3: Create AuthorCell.vue**

```vue
<!-- src/components/commit/components/cells/AuthorCell.vue -->
<script setup lang="ts">
defineProps<{ author: string }>()
</script>

<template>
  <span class="author-cell truncate text-sm text-[var(--commit-text)]">{{ author }}</span>
</template>
```

- [ ] **Step 4: Create DateCell.vue**

```vue
<!-- src/components/commit/components/cells/DateCell.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { formatRelativeTime } from '../../utils/commitHelpers'

const props = defineProps<{ timestamp: number }>()

const display = computed(() => formatRelativeTime(props.timestamp))
</script>

<template>
  <span class="date-cell text-xs text-[var(--commit-text-secondary)] whitespace-nowrap">{{ display }}</span>
</template>
```

- [ ] **Step 5: Commit**

```powershell
git add src/components/commit/components/cells/HashCell.vue src/components/commit/components/cells/MessageCell.vue src/components/commit/components/cells/AuthorCell.vue src/components/commit/components/cells/DateCell.vue
git commit -m "feat: add cell components (Hash, Message, Author, Date)"
```

---

### Task 4: useCommitList Orchestration Composable

**Files:**
- Create: `src/components/commit/composables/useCommitList.ts`

- [ ] **Step 1: Implement useCommitList**

```typescript
// src/components/commit/composables/useCommitList.ts
import { ref, computed, watch, onMounted } from 'vue'
import { useVirtualizer } from '@tanstack/vue-virtual'
import { useRepoStore } from '../../../stores/repo'
import { useCommitsStore } from '../../../stores/commits'
import { useFilter } from './useFilter'
import { useInfiniteScroll } from './useInfiniteScroll'
import type { Commit } from '../../../types/git'

export interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  commit: Commit | null
}

const ROW_HEIGHT = 40

export function useCommitList() {
  const repoStore = useRepoStore()
  const commitsStore = useCommitsStore()

  const scrollContainer = ref<HTMLElement | null>(null)
  const loadingMore = ref(false)

  const displayCommits = computed(() => repoStore.activeRepo?.commits ?? [])
  const hasMore = computed(() => repoStore.activeRepo?.hasMore ?? false)
  const loading = computed(() => repoStore.activeRepo?.loading ?? false)

  const { filterText, filteredCommits } = useFilter(displayCommits)

  const selectedCommitId = computed(() => repoStore.activeRepo?.selectedCommit?.id ?? null)
  const hoveredId = ref<string | null>(null)

  const contextMenu = ref<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    commit: null,
  })

  const rowVirtualizer = useVirtualizer({
    count: computed(() => filteredCommits.value.length),
    getScrollElement: () => scrollContainer.value,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  })

  const totalHeight = computed(() => rowVirtualizer.value.getTotalSize())
  const visibleItems = computed(() => rowVirtualizer.value.getVirtualItems())

  async function loadMoreCommits() {
    const activePath = repoStore.activeRepoPath
    if (!activePath || loadingMore.value || !hasMore.value) return
    const lastCommit = displayCommits.value[displayCommits.value.length - 1]
    if (!lastCommit) return
    loadingMore.value = true
    try {
      await commitsStore.fetchLogs(activePath, 50, lastCommit.id)
    } finally {
      loadingMore.value = false
    }
  }

  const { onScroll } = useInfiniteScroll(scrollContainer, {
    threshold: 200,
    onLoadMore: loadMoreCommits,
  })

  function selectCommit(commit: Commit | null) {
    if (repoStore.activeRepoPath) {
      commitsStore.selectCommit(repoStore.activeRepoPath, commit)
    }
  }

  function handleClick(commit: Commit) {
    selectCommit(commit)
  }

  function setHovered(id: string | null) {
    hoveredId.value = id
  }

  function showContextMenu(x: number, y: number, commit: Commit) {
    contextMenu.value = { visible: true, x, y, commit }
  }

  function hideContextMenu() {
    contextMenu.value = { visible: false, x: 0, y: 0, commit: null }
  }

  function scrollToIndex(index: number) {
    rowVirtualizer.value.scrollToIndex(index, { align: 'center' })
  }

  function scrollToHead() {
    scrollToIndex(0)
  }

  watch(() => repoStore.activeRepoPath, async (newPath) => {
    if (newPath) {
      const openRepo = repoStore.openRepos.get(newPath)
      if (openRepo && openRepo.commits.length === 0) {
        await commitsStore.fetchLogs(newPath)
      }
    }
  })

  onMounted(() => {
    if (repoStore.activeRepoPath) {
      const openRepo = repoStore.openRepos.get(repoStore.activeRepoPath)
      if (openRepo && openRepo.commits.length === 0) {
        commitsStore.fetchLogs(repoStore.activeRepoPath)
      }
    }
  })

  return {
    scrollContainer,
    filterText,
    filteredCommits,
    totalHeight,
    visibleItems,
    selectedCommitId,
    hoveredId,
    contextMenu,
    loading,
    loadingMore,
    selectCommit,
    handleClick,
    setHovered,
    showContextMenu,
    hideContextMenu,
    onScroll,
    loadMoreCommits,
    scrollToHead,
  }
}
```

- [ ] **Step 2: Verify compilation**

```powershell
cd git-client; npx vue-tsc --noEmit 2>&1 | Select-String "useCommitList"
```

Expected: No related errors

- [ ] **Step 3: Commit**

```powershell
git add src/components/commit/composables/useCommitList.ts
git commit -m "feat: add useCommitList orchestration composable"
```

---

### Task 5: Rewrite commit-list.vue

**Files:**
- Modify: `src/components/commit/components/commit-list/commit-list.vue`

- [ ] **Step 1: Rewrite commit-list.vue**

```vue
<!-- src/components/commit/components/commit-list/commit-list.vue -->
<script setup lang="ts">
import { h, computed } from 'vue'
import { NDropdown } from 'naive-ui'
import type { DropdownOption } from 'naive-ui'
import { getFirstLine, formatCommitInfo } from '../../utils/commitHelpers'
import { useCommitList } from '../../composables/useCommitList'
import type { Commit } from '../../../types/git'
import HashCell from '../cells/HashCell.vue'
import MessageCell from '../cells/MessageCell.vue'
import AuthorCell from '../cells/AuthorCell.vue'
import DateCell from '../cells/DateCell.vue'

const {
  scrollContainer,
  filterText,
  filteredCommits,
  totalHeight,
  visibleItems,
  selectedCommitId,
  hoveredId,
  contextMenu,
  handleClick,
  setHovered,
  showContextMenu,
  hideContextMenu,
  onScroll,
  scrollToHead,
} = useCommitList()

function onContextMenu(e: MouseEvent, commit: Commit) {
  e.preventDefault()
  showContextMenu(e.clientX, e.clientY, commit)
}

function onDropdownSelect(key: string) {
  if (!contextMenu.value.commit) return
  hideContextMenu()
}

function onCopySHA(commit: Commit) {
  navigator.clipboard.writeText(commit.id)
  hideContextMenu()
}

function onCopyInfo(commit: Commit) {
  navigator.clipboard.writeText(formatCommitInfo(commit))
  hideContextMenu()
}

function scroller() {
  onScroll()
}

const menuOptions = computed<DropdownOption[]>(() => {
  if (!contextMenu.value.commit) return []
  return [
    { key: 'cherry-pick', label: 'Cherry-pick this commit', icon: renderIcon('cherry') },
    { key: 'divider-1', type: 'divider' },
    { key: 'rebase', label: 'Rebase onto this commit...', icon: renderIcon('rebase') },
    {
      key: 'reset',
      label: 'Reset',
      children: [
        { key: 'reset-soft', label: 'Soft' },
        { key: 'reset-mixed', label: 'Mixed' },
        { key: 'reset-hard', label: 'Hard', props: { style: 'color: var(--danger-color, #ef4444)' } },
      ],
    },
    { key: 'divider-2', type: 'divider' },
    { key: 'create-branch', label: 'Create Branch here...', icon: renderIcon('branch') },
    { key: 'create-tag', label: 'Tag this version...', icon: renderIcon('tag') },
    { key: 'divider-3', type: 'divider' },
    { key: 'copy-sha', label: 'Copy SHA', icon: renderIcon('copy') },
    { key: 'copy-info', label: 'Copy commit info' },
    { key: 'divider-4', type: 'divider' },
    { key: 'view-diff', label: 'View diff', icon: renderIcon('diff') },
    { key: 'scroll-to-head', label: 'Scroll to HEAD', icon: renderIcon('head') },
  ]
})

const SVG_PATHS: Record<string, string> = {
  cherry: 'M12 2a7 7 0 00-7 7c0 2.38 1.19 4.47 3 5.74V17a2 2 0 002 2h4a2 2 0 002-2v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 00-7-7zM9 21h6',
  rebase: 'M4 12h16m-4-4l4 4-4 4',
  branch: 'M6 3v12m0 0a3 3 0 100 6 3 3 0 000-6zm12-6a3 3 0 100 6 3 3 0 000-6zM6 9h12',
  tag: 'M20.59 13.41l-7.17-7.17a2 2 0 00-1.41-.59H5a2 2 0 00-2 2v6.83a2 2 0 00.59 1.41l7.17 7.17a2 2 0 002.83 0l7-7a2 2 0 000-2.83zM8 11a1 1 0 110-2 1 1 0 010 2z',
  copy: 'M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z',
  diff: 'M9 5l7 7-7 7',
  head: 'M5 12h14M12 5l7 7-7 7',
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
</script>

<template>
  <div class="commit-list flex flex-col h-full bg-[var(--commit-bg,transparent)]">
    <div class="toolbar flex items-center gap-2 px-3 py-2 border-b border-[var(--commit-border,#3c3c3c)]">
      <div class="search-box flex items-center bg-[var(--commit-bg-hover,rgba(255,255,255,0.05))] rounded px-2 py-1 flex-1 max-w-80">
        <svg class="w-4 h-4 text-[var(--commit-text-secondary)] mr-1 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          v-model="filterText"
          type="text"
          placeholder="Search commits..."
          class="bg-transparent border-none outline-none text-sm text-[var(--commit-text)] w-full placeholder:text-[var(--commit-text-secondary)]"
        />
        <span v-if="filterText" class="text-xs text-[var(--commit-text-secondary)] ml-1">{{ filteredCommits.length }}</span>
      </div>
    </div>

    <div class="column-header flex items-center h-7 px-3 text-xs text-[var(--commit-text-secondary)] border-b border-[var(--commit-border,#3c3c3c)]">
      <span class="w-20 shrink-0">Hash</span>
      <span class="flex-1 min-w-0">Message</span>
      <span class="w-32 shrink-0">Author</span>
      <span class="w-20 shrink-0 text-right">Date</span>
    </div>

    <div
      ref="scrollContainer"
      class="scroll-container flex-1 overflow-y-auto"
      @scroll="scroller"
    >
      <div :style="{ height: totalHeight + 'px', position: 'relative' }">
        <div
          v-for="item in visibleItems"
          :key="item.index"
          :style="{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            transform: `translateY(${item.start}px)`,
          }"
          :data-index="item.index"
        >
          <div
            v-if="filteredCommits[item.index]"
            class="commit-row flex items-center h-10 px-3 border-b border-[var(--commit-border,#3c3c3c)] cursor-pointer transition-colors"
            :class="{
              'bg-[var(--commit-bg-selected,rgba(59,130,246,0.3))]': filteredCommits[item.index].id === selectedCommitId,
              'bg-[var(--commit-bg-hover,rgba(255,255,255,0.05))]': filteredCommits[item.index].id === hoveredId && filteredCommits[item.index].id !== selectedCommitId,
            }"
            @click="handleClick(filteredCommits[item.index])"
            @contextmenu="onContextMenu($event, filteredCommits[item.index])"
            @mouseenter="setHovered(filteredCommits[item.index].id)"
            @mouseleave="setHovered(null)"
          >
            <div class="w-20 shrink-0">
              <HashCell :hash="filteredCommits[item.index].id" />
            </div>
            <div class="flex-1 min-w-0 mr-2">
              <MessageCell
                :message="filteredCommits[item.index].message"
                :query="filterText"
              />
            </div>
            <div class="w-32 shrink-0">
              <AuthorCell :author="filteredCommits[item.index].author" />
            </div>
            <div class="w-20 shrink-0 text-right">
              <DateCell :timestamp="filteredCommits[item.index].time" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <NDropdown
      :show="contextMenu.visible"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :options="menuOptions"
      trigger="manual"
      to="body"
      animated
      @select="onDropdownSelect"
      @clickoutside="hideContextMenu"
    />
  </div>
</template>
```

- [ ] **Step 2: Verify build**

```powershell
cd git-client; npx vue-tsc --noEmit 2>&1 | Select-String "commit-list"
```

Expected: No errors

- [ ] **Step 3: Commit**

```powershell
git add src/components/commit/components/commit-list/commit-list.vue
git commit -m "feat: rewrite commit-list with search, virtual scroll, context menu"
```

---

### Task 6: Run All Tests and Verify

**Files:**
- All new and modified files

- [ ] **Step 1: Run unit tests**

```powershell
cd git-client; npx vitest run src/components/commit/composables/useFilter.test.ts
```

Expected: All tests PASS

- [ ] **Step 2: Run TypeScript type check**

```powershell
cd git-client; npx vue-tsc --noEmit
```

Expected: No type errors

- [ ] **Step 3: Start dev server for manual verification**

```powershell
cd git-client; npm run dev
```

Checklist:
- [ ] Commit list renders with Hash / Message / Author / Date columns
- [ ] Clicking a row selects it (blue highlight)
- [ ] Hover shows row highlight
- [ ] Right-click opens context menu with all items
- [ ] Search filters commits in real-time
- [ ] Search highlights matching text in message cells
- [ ] Scroll to bottom loads more commits
- [ ] "Copy SHA" copies commit hash to clipboard
- [ ] "Scroll to HEAD" scrolls to top

- [ ] **Step 4: Final commit**

```powershell
git add -A
git commit -m "feat: complete CommitList component with search, virtual scroll, context menu"
```
