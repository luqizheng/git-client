# Task 3: 改造 CommitList.vue 双栏布局

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** 将 CommitList.vue 从单列列表改造为左侧 GraphColumn + 右侧 CommitInfo 双栏布局，并在 commits store 中添加分支筛选功能。

**Architecture:** CommitList.vue 使用 flex 布局，左侧嵌入 GraphColumn（120px 固定宽度），右侧保留现有 commit 信息列表。commits.ts store 添加 filterByBranch 和 clearBranchFilter 方法。

**Tech Stack:** Vue 3, Naive UI, TypeScript

**Dependencies:** Task 2（GraphColumn.vue 组件）

---

**Files:**
- Modify: `src/components/commit/CommitList.vue`
- Modify: `src/stores/commits.ts`

- [ ] **Step 1: 改造 CommitList.vue 为双栏布局**

修改 `src/components/commit/CommitList.vue`，将现有列表改为左侧图形 + 右侧信息的双栏布局：

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
      <n-button
        v-if="activeBranchFilter"
        size="tiny"
        quaternary
        @click="clearBranchFilter"
      >
        ✕ {{ activeBranchFilter }}
      </n-button>
    </div>

    <div class="flex-1 flex overflow-hidden" ref="listContainerRef">
      <GraphColumn
        :width="120"
        :commits="displayCommits"
        :selected-id="selectedId"
        class="flex-shrink-0"
        @select="selectCommit"
        @branch-click="onBranchClick"
      />

      <div
        class="flex-1 overflow-y-auto"
        @scroll="onScroll"
      >
        <div v-if="isSearching" class="text-xs text-gray-500 p-2">
          {{ repo.searchLoading ? 'Searching...' : `${repo.searchResults.length} results` }}
        </div>
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
        <div v-if="activeOpenRepo?.loading" class="text-center text-gray-500 text-xs py-3">Loading...</div>
        <div v-if="!isSearching && activeOpenRepo?.hasMore && !activeOpenRepo?.loading" ref="loadMoreRef" class="h-1" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { NInput, NSelect, NButton } from 'naive-ui'
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
const listContainerRef = ref<HTMLElement | null>(null)
const activeBranchFilter = ref<string | null>(null)

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
    activeBranchFilter.value = branchName
  }
}

function clearBranchFilter() {
  if (repo.activeRepoPath) {
    commits.clearBranchFilter(repo.activeRepoPath)
    activeBranchFilter.value = null
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

function onScroll() {
  // scroll handler kept for potential future use
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
    activeBranchFilter.value = null
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
})

onUnmounted(() => {
  observer?.disconnect()
  if (debounceTimer) clearTimeout(debounceTimer)
})
</script>
```

- [ ] **Step 2: 更新 commits store 添加分支筛选方法**

修改 `src/stores/commits.ts`，添加 `filterByBranch` 和 `clearBranchFilter`。完整替换文件内容：

```typescript
import { defineStore } from 'pinia'
import type { Commit } from '../types/git'
import { invoke } from '../utils/ipc'
import { useRepoStore } from './repo'

export const useCommitsStore = defineStore('commits', () => {
  async function fetchLogs(repoPath: string, limit = 50, after?: string) {
    const repo = useRepoStore()
    const openRepo = repo.openRepos.get(repoPath)
    if (!openRepo) return
    openRepo.loading = true
    try {
      const result = await invoke<Commit[]>('get_log', { repoPath, limit, after })
      if (after) {
        openRepo.commits.push(...result)
      } else {
        openRepo.commits = result
      }
      openRepo.hasMore = result.length >= limit
    } catch (e) {
      console.error('fetchLogs error:', e)
    } finally {
      openRepo.loading = false
    }
  }

  function selectCommit(repoPath: string, commit: Commit | null) {
    const repo = useRepoStore()
    const openRepo = repo.openRepos.get(repoPath)
    if (openRepo) {
      openRepo.selectedCommit = commit
    }
  }

  function clearCommits(repoPath: string) {
    const repo = useRepoStore()
    const openRepo = repo.openRepos.get(repoPath)
    if (openRepo) {
      openRepo.commits = []
      openRepo.selectedCommit = null
      openRepo.hasMore = true
    }
  }

  function filterByBranch(repoPath: string, branchName: string) {
    const repo = useRepoStore()
    const openRepo = repo.openRepos.get(repoPath)
    if (!openRepo) return

    if (!(openRepo as any)._originalCommits) {
      (openRepo as any)._originalCommits = [...openRepo.commits]
    }

    openRepo.commits = openRepo.commits.filter(commit =>
      commit.refs.some(ref => ref.includes(branchName))
    )
  }

  function clearBranchFilter(repoPath: string) {
    const repo = useRepoStore()
    const openRepo = repo.openRepos.get(repoPath)
    if (!openRepo) return

    const original = (openRepo as any)._originalCommits
    if (original) {
      openRepo.commits = [...original]
      delete (openRepo as any)._originalCommits
    }
  }

  return { fetchLogs, selectCommit, clearCommits, filterByBranch, clearBranchFilter }
})
```

- [ ] **Step 3: 验证构建**

Run:
```powershell
cd d:\projects\req2task-2\git-client
npx vite build
```

Expected: 成功（无 TypeScript 错误）

- [ ] **Step 4: Commit**

```bash
git add src/components/commit/CommitList.vue src/stores/commits.ts
git commit -m "feat: integrate GraphColumn into CommitList with dual-column layout"
```
