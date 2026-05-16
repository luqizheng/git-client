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

  const rowVirtualizer = useVirtualizer(computed(() => ({
    count: filteredCommits.value.length,
    getScrollElement: () => scrollContainer.value,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
    getItem: (index: number) => ({
      index,
      commit: filteredCommits.value[index],
    }),
  })))

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
