import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { RepoState, Commit, OpenRepo, SearchFilter } from '../types/git'
import { invoke } from '../utils/ipc'

export const useRepoStore = defineStore('repo', () => {
  const openRepos = ref<Map<string, OpenRepo>>(new Map())
  const activeRepoPath = ref<string | null>(null)
  const recentRepos = ref<string[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const searchQuery = ref('')
  const searchFilter = ref<SearchFilter>('all')
  const searchResults = ref<Commit[]>([])
  const searchLoading = ref(false)

  const activeRepo = computed(() => {
    if (!activeRepoPath.value) return null
    return openRepos.value.get(activeRepoPath.value) ?? null
  })

  function repoName(path: string): string {
    const parts = path.replace(/\\/g, '/').split('/')
    return parts[parts.length - 1] || path
  }

  async function openRepo(path: string) {
    loading.value = true
    error.value = null
    try {
      const state = await invoke<RepoState>('open_repo', { path })
      openRepos.value.set(path, {
        state,
        commits: [],
        branches: [],
        selectedCommit: null,
        hasMore: true,
        loading: false,
      })
      activeRepoPath.value = path
      if (!recentRepos.value.includes(path)) {
        recentRepos.value.unshift(path)
        if (recentRepos.value.length > 10) {
          recentRepos.value = recentRepos.value.slice(0, 10)
        }
      }
    } catch (e) {
      error.value = String(e)
    } finally {
      loading.value = false
    }
  }

  async function initRepo(path: string, bare: boolean) {
    loading.value = true
    error.value = null
    try {
      const state = await invoke<RepoState>('init_repo', { path, bare })
      openRepos.value.set(path, {
        state,
        commits: [],
        branches: [],
        selectedCommit: null,
        hasMore: true,
        loading: false,
      })
      activeRepoPath.value = path
    } catch (e) {
      error.value = String(e)
    } finally {
      loading.value = false
    }
  }

  async function cloneRepo(url: string, path: string) {
    loading.value = true
    error.value = null
    try {
      const state = await invoke<RepoState>('clone_repo', { url, path })
      openRepos.value.set(path, {
        state,
        commits: [],
        branches: [],
        selectedCommit: null,
        hasMore: true,
        loading: false,
      })
      activeRepoPath.value = path
      if (!recentRepos.value.includes(path)) {
        recentRepos.value.unshift(path)
        if (recentRepos.value.length > 10) {
          recentRepos.value = recentRepos.value.slice(0, 10)
        }
      }
    } catch (e) {
      error.value = String(e)
    } finally {
      loading.value = false
    }
  }

  async function closeRepo(path: string) {
    try {
      await invoke('close_repo', { path })
    } catch (e) {
      console.warn('close_repo error:', e)
    }
    openRepos.value.delete(path)
    if (activeRepoPath.value === path) {
      const keys = Array.from(openRepos.value.keys())
      activeRepoPath.value = keys.length > 0 ? keys[keys.length - 1] : null
    }
    const idx = recentRepos.value.indexOf(path)
    if (idx !== -1) recentRepos.value.splice(idx, 1)
  }

  function switchTab(path: string) {
    if (openRepos.value.has(path)) {
      activeRepoPath.value = path
    }
  }

  async function searchCommits() {
    if (!activeRepoPath.value || !searchQuery.value.trim()) return
    searchLoading.value = true
    try {
      searchResults.value = await invoke<Commit[]>('search_commits', {
        repoPath: activeRepoPath.value,
        query: searchQuery.value,
        filter: searchFilter.value,
        limit: 50,
      })
    } catch (e) {
      console.error('search error:', e)
    } finally {
      searchLoading.value = false
    }
  }

  function clearSearch() {
    searchQuery.value = ''
    searchResults.value = []
    searchFilter.value = 'all'
  }

  return {
    openRepos, activeRepoPath, recentRepos, loading, error,
    searchQuery, searchFilter, searchResults, searchLoading,
    activeRepo, repoName,
    openRepo, initRepo, cloneRepo, closeRepo, switchTab, searchCommits, clearSearch,
  }
})
