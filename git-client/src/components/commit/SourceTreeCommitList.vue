<template>
  <div class="source-tree-commit-list">
    <div class="toolbar">
      <button class="toolbar-btn" @click="onShowAll">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
        </svg>
        Show All
      </button>
      <div v-if="loading" class="loading-text">
        <span class="spinner"></span>
        Loading...
      </div>
    </div>

    <ColumnHeader
      :columns="visibleColumns"
      :graph-width="graphWidth"
      @resize="resizeColumn"
    />

    <div
      ref="scrollContainer"
      class="scroll-container"
      @scroll="onScroll"
    >
      <div
        class="scroll-content"
        :style="{ height: totalHeight + 'px' }"
      >
        <template v-for="item in visibleItems" :key="getItemKey(item)">
          <TimeGroupHeader
            v-if="item.type === 'group'"
            :group="item.group"
            :offset="item.offset"
          />
          <CommitRow
            v-else
            :commit="item.commit"
            :columns="visibleColumns"
            :graph-width="graphWidth"
            :graph-node="graph.nodes.get(item.commit.id)"
            :graph-connections="graph.connections"
            :max-lane="graph.maxLane"
            :selected="item.commit.id === selectedCommitId"
            :offset="item.offset"
            @click="selectCommit(item.commit)"
            @contextmenu="handleContextMenu($event, item.commit)"
          />
        </template>
      </div>

      <div v-if="loadingMore" class="loading-more">
        <span class="spinner"></span>
        Loading more commits...
      </div>

      <div v-if="!hasMore && displayCommits.length > 0" class="no-more">
        No more commits
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
import { ref, computed, reactive, watch, onMounted, onUnmounted, h } from 'vue'
import { NDropdown } from 'naive-ui'
import type { DropdownOption } from 'naive-ui'
import type { Commit } from '../../types/git'
import { useCommitsStore } from '../../stores/commits'
import { useRepoStore } from '../../stores/repo'
import { invoke } from '../../utils/ipc'
import { useResizableColumns } from './composables/useResizableColumns'
import { useVirtualScroll, createVirtualItems, type VirtualItem } from './composables/useVirtualScroll'
import { useTimeGrouping } from './composables/useTimeGrouping'
import { useInfiniteScroll } from './composables/useInfiniteScroll'
import { useCommitGraph } from './composables/useCommitGraph'
import ColumnHeader from './components/ColumnHeader.vue'
import TimeGroupHeader from './components/TimeGroupHeader.vue'
import CommitRow from './components/CommitRow.vue'

const repo = useRepoStore()
const commitsStore = useCommitsStore()

const { columns, resizeColumn } = useResizableColumns()
const scrollContainer = ref<HTMLElement | null>(null)

const visibleColumns = computed(() =>
  columns.value.filter(c => c.key !== 'graph')
)

const activeOpenRepo = computed(() => repo.activeRepo)
const selectedCommitId = computed(() => activeOpenRepo.value?.selectedCommit?.id ?? null)
const displayCommits = computed(() => activeOpenRepo.value?.commits ?? [])
const loading = computed(() => activeOpenRepo.value?.loading ?? false)
const hasMore = computed(() => activeOpenRepo.value?.hasMore ?? false)

const { groups } = useTimeGrouping(displayCommits)
const virtualItems = computed(() => createVirtualItems(displayCommits.value, groups.value))

const {
  totalHeight,
  visibleItems,
  handleScroll,
  updateContainerHeight,
} = useVirtualScroll(scrollContainer, virtualItems)

const { graph, graphWidth } = useCommitGraph(displayCommits)

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

const { handleScroll: handleInfiniteScroll } = useInfiniteScroll(scrollContainer, {
  threshold: 200,
  onLoadMore: loadMoreCommits,
  hasMore,
  loading: computed(() => loading.value || loadingMore.value),
})

function onScroll(e: Event) {
  handleScroll(e)
  handleInfiniteScroll()
}

function getItemKey(item: VirtualItem & { offset: number }): string {
  return item.type === 'commit' ? item.commit.id : item.group.key
}

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

function selectCommit(commit: Commit) {
  if (repo.activeRepoPath) {
    commitsStore.selectCommit(repo.activeRepoPath, commit)
  }
}

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
    case 'cherry-pick':
      emit('cherry-pick', contextMenu.commit.id)
      break
    case 'copy-sha':
      navigator.clipboard.writeText(contextMenu.commit.id)
      break
  }
}

function onShowAll() {
  if (repo.activeRepoPath) {
    commitsStore.clearBranchFilter(repo.activeRepoPath)
  }
  emit('show-all')
}

const emit = defineEmits<{
  select: [commit: Commit]
  'cherry-pick': [commitId: string]
  'show-all': []
}>()

watch(() => repo.activeRepoPath, async (newPath) => {
  if (newPath) {
    const openRepo = repo.openRepos.get(newPath)
    if (openRepo && openRepo.commits.length === 0) {
      await commitsStore.fetchLogs(newPath)
    }
    invoke('start_watch', { repoPath: newPath })
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
  window.addEventListener('resize', handleResize)
})

function handleResize() {
  updateContainerHeight()
}

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
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
  gap: 12px;
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

.loading-text {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--text-secondary, #969696);
}

.spinner {
  width: 12px;
  height: 12px;
  border: 2px solid var(--border-color, #3c3c3c);
  border-top-color: var(--accent-color, #0078d4);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
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

.scroll-content {
  position: relative;
}

.loading-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  font-size: 12px;
  color: var(--text-secondary, #969696);
}

.no-more {
  text-align: center;
  padding: 16px;
  font-size: 12px;
  color: var(--text-secondary, #969696);
  opacity: 0.6;
}
</style>
