import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { FileDiff } from '../types/git'
import { invoke } from '../utils/ipc'

interface FileState {
  staged: FileDiff[]
  unstaged: FileDiff[]
}

export const useStagingStore = defineStore('staging', () => {
  const fileStates = ref<Map<string, FileState>>(new Map())
  const loadingStates = ref<Map<string, boolean>>(new Map())

  function getFileState(repoPath: string): FileState {
    return fileStates.value.get(repoPath) ?? { staged: [], unstaged: [] }
  }

  async function refresh(repoPath: string) {
    loadingStates.value.set(repoPath, true)
    try {
      const staged = await invoke<FileDiff[]>('get_staged_diff', { repoPath })
      const unstaged = await invoke<FileDiff[]>('get_working_diff', { repoPath })
      fileStates.value.set(repoPath, { staged, unstaged })
    } catch (e) {
      console.error('staging refresh error:', e)
    } finally {
      loadingStates.value.set(repoPath, false)
    }
  }

  async function stageFiles(repoPath: string, paths: string[]) {
    await invoke('stage_files', { repoPath, paths })
  }

  async function unstageFiles(repoPath: string, paths: string[]) {
    await invoke('unstage_files', { repoPath, paths })
  }

  function clearState(repoPath: string) {
    fileStates.value.delete(repoPath)
    loadingStates.value.delete(repoPath)
  }

  return { fileStates, loadingStates, getFileState, refresh, stageFiles, unstageFiles, clearState }
})
