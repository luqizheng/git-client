import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Commit } from '../types/git'
import { invoke } from '../utils/ipc'

export const useCommitsStore = defineStore('commits', () => {
  const commits = ref<Commit[]>([])
  const selectedCommit = ref<Commit | null>(null)
  const loading = ref(false)
  const hasMore = ref(true)

  async function fetchLogs(repoPath: string, limit = 50, after?: string) {
    loading.value = true
    try {
      const result = await invoke<Commit[]>('get_log', { repoPath, limit, after })
      if (after) {
        commits.value.push(...result)
      } else {
        commits.value = result
      }
      hasMore.value = result.length >= limit
    } catch (e) {
      console.error('fetchLogs error:', e)
    } finally {
      loading.value = false
    }
  }

  function selectCommit(commit: Commit | null) {
    selectedCommit.value = commit
  }

  function clearCommits() {
    commits.value = []
    selectedCommit.value = null
    hasMore.value = true
  }

  return { commits, selectedCommit, loading, hasMore, fetchLogs, selectCommit, clearCommits }
})
