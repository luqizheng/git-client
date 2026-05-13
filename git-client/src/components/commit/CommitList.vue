<template>
  <div class="flex flex-col border-r border-gray-700 w-full max-w-md">
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
    </div>
    <div class="flex-1 overflow-y-auto" @scroll="onScroll">
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
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { NInput, NSelect } from 'naive-ui'
import { useRepoStore } from '../../stores/repo'
import { useCommitsStore } from '../../stores/commits'
import { invoke } from '../../utils/ipc'
import type { Commit } from '../../types/git'

const repo = useRepoStore()
const commits = useCommitsStore()

const loadMoreRef = ref<HTMLElement | null>(null)

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
  // scroll handler kept for potential future use (e.g. scroll position tracking)
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
})

onUnmounted(() => {
  observer?.disconnect()
  if (debounceTimer) clearTimeout(debounceTimer)
})
</script>
