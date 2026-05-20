import { defineStore } from 'pinia'
import { ref } from 'vue'
import { invoke } from '../utils/ipc'

export interface RebaseOperation {
  id: number
  commit_id: string
  action: string
  message: string
}

export interface RebaseInfo {
  original_head: string
  onto: string
  current_operation: number | null
}

export const useRebaseStore = defineStore('rebase', () => {
  const inProgress = ref(false)
  const operations = ref<RebaseOperation[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  async function startRebase(repoPath: string, upstream: string, branch?: string) {
    isLoading.value = true
    error.value = null
    try {
      await invoke('rebase_branch', { repoPath, upstream, branch: branch || null })
      await checkRebaseInProgress(repoPath)
    } catch (e) {
      error.value = String(e)
      throw e
    } finally {
      isLoading.value = false
    }
  }

  async function checkRebaseInProgress(repoPath: string): Promise<boolean> {
    try {
      const info = await invoke<RebaseInfo | null>('get_rebase_in_progress', { repoPath })
      inProgress.value = info !== null
      if (inProgress.value) {
        await fetchOperations(repoPath)
      }
      return inProgress.value
    } catch {
      inProgress.value = false
      return false
    }
  }

  async function fetchOperations(repoPath: string) {
    try {
      operations.value = await invoke<RebaseOperation[]>('get_rebase_operations', { repoPath })
    } catch (e) {
      console.error('fetchOperations error:', e)
      operations.value = []
    }
  }

  async function continueRebase(repoPath: string) {
    isLoading.value = true
    error.value = null
    try {
      await invoke('rebase_continue', { repoPath })
      inProgress.value = false
      operations.value = []
    } catch (e) {
      error.value = String(e)
      await fetchOperations(repoPath)
      throw e
    } finally {
      isLoading.value = false
    }
  }

  async function abortRebase(repoPath: string) {
    isLoading.value = true
    error.value = null
    try {
      await invoke('rebase_abort', { repoPath })
      inProgress.value = false
      operations.value = []
    } catch (e) {
      error.value = String(e)
      throw e
    } finally {
      isLoading.value = false
    }
  }

  return {
    inProgress,
    operations,
    isLoading,
    error,
    startRebase,
    checkRebaseInProgress,
    fetchOperations,
    continueRebase,
    abortRebase
  }
})
