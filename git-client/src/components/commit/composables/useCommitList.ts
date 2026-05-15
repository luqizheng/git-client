import { ref, computed, watch, onMounted } from 'vue'
import { useRepoStore } from '../../../stores/repo'
import { useCommitsStore } from '../../../stores/commits'
import { invoke } from '../../../utils/ipc'
import { useFilterGroup } from './useFilterGroup'
import { useTimeGrouping } from './useTimeGrouping'
import { useCommitGraph } from './useCommitGraph'
import { useVirtualScroll, createVirtualItems } from './useVirtualScroll'
import { useInteractions } from './useInteractions'
import { useContextMenu } from './useContextMenu'
import { useKeyboardNav } from './useKeyboardNav'
import { useInfiniteScroll } from './useInfiniteScroll'
import { useResizableColumns } from './useResizableColumns'
import type { Commit } from '../../../types/git'

export function useCommitList() {
  const repo = useRepoStore()
  const commitsStore = useCommitsStore()
  const { columns, resizeColumn } = useResizableColumns()
  const scrollContainer = ref<HTMLElement | null>(null)
  const scrollTop = ref(0)
  const viewportHeight = ref(600)

  const visibleColumns = computed(() =>
    columns.value.filter(c => c.key !== 'graph'),
  )

  const activeOpenRepo = computed(() => repo.activeRepo)
  const selectedCommitId = computed(() => activeOpenRepo.value?.selectedCommit?.id ?? null)
  const displayCommits = computed(() => activeOpenRepo.value?.commits ?? [])
  const loading = computed(() => activeOpenRepo.value?.loading ?? false)
  const hasMore = computed(() => activeOpenRepo.value?.hasMore ?? false)

  const { filterText, filterType, filteredCommits } = useFilterGroup(displayCommits)
  const { groups } = useTimeGrouping(filteredCommits)

  const groupingEnabled = ref(true)
  const collapsedGroups = ref<Set<string>>(new Set())

  const virtualItems = computed(() => {
    if (!groupingEnabled.value) {
      return filteredCommits.value.map(c => ({
        type: 'commit' as const,
        commit: c,
        height: 40,
      }))
    }
    return createVirtualItems(filteredCommits.value, groups.value, collapsedGroups.value)
  })

  const { graph, graphWidth } = useCommitGraph(filteredCommits)

  const {
    totalHeight,
    visibleItems,
    handleScroll: handleVScroll,
    updateContainerHeight,
    scrollToIndex,
  } = useVirtualScroll(scrollContainer, virtualItems)

  const {
    hoveredId,
    selectedIds,
    handleClick,
    setHovered,
    clearSelection,
  } = useInteractions(selectedCommitId)

  const { state: contextMenuState, open: openContextMenu, close: closeContextMenu } = useContextMenu()

  const commitOnlyItems = computed(() =>
    virtualItems.value.filter(i => i.type === 'commit'),
  )

  const { focusedIndex, handleKeyDown, onEnter, onEscape, onSearch: _onSearch, setFocusedIndex } = useKeyboardNav(
    computed(() => commitOnlyItems.value.length),
  )

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
    handleVScroll(e)
    handleInfiniteScroll()
    if (scrollContainer.value) {
      scrollTop.value = scrollContainer.value.scrollTop
      viewportHeight.value = scrollContainer.value.clientHeight
    }
  }

  const idToRowIdx = computed(() => {
    const map = new Map<string, number>()
    filteredCommits.value.forEach((c, i) => map.set(c.id, i))
    return map
  })

  function selectCommit(commit: Commit) {
    if (repo.activeRepoPath) {
      commitsStore.selectCommit(repo.activeRepoPath, commit)
    }
  }

  function toggleGroup(key: string) {
    if (collapsedGroups.value.has(key)) {
      collapsedGroups.value.delete(key)
      collapsedGroups.value = new Set(collapsedGroups.value)
    } else {
      collapsedGroups.value = new Set([...collapsedGroups.value, key])
    }
  }

  function scrollToCommit(commitId: string) {
    const idx = filteredCommits.value.findIndex(c => c.id.startsWith(commitId))
    if (idx !== -1) {
      setFocusedIndex(idx)
      scrollToIndex(idx)
    }
  }

  onEnter(() => {
    const item = commitOnlyItems.value[focusedIndex.value]
    if (item && item.type === 'commit') {
      selectCommit(item.commit)
    }
  })

  onEscape(() => {
    filterText.value = ''
    closeContextMenu()
  })

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
    if (scrollContainer.value) {
      viewportHeight.value = scrollContainer.value.clientHeight
    }
    updateContainerHeight()
  })

  return {
    scrollContainer,
    columns,
    visibleColumns,
    graph,
    graphWidth,
    displayCommits,
    filteredCommits,
    totalHeight,
    visibleItems,
    scrollTop,
    viewportHeight,
    scrollToIndex,
    selectedCommitId,
    hoveredId,
    selectedIds,
    contextMenuState,
    filterText,
    filterType,
    loading,
    loadingMore,
    hasMore,
    groupingEnabled,
    collapsedGroups,
    focusedIndex,
    idToRowIdx,
    selectCommit,
    handleClick,
    setHovered,
    clearSelection,
    openContextMenu,
    closeContextMenu,
    handleKeyDown,
    onScroll,
    loadMoreCommits,
    toggleGroup,
    scrollToCommit,
    resizeColumn,
  }
}
