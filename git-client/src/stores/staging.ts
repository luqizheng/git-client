import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { FileDiff } from '../types/git'
import { invoke } from '../utils/ipc'

export const useStagingStore = defineStore('staging', () => {
  const stagedFiles = ref<FileDiff[]>([])
  const unstagedFiles = ref<FileDiff[]>([])
  const loading = ref(false)

  async function refresh(repoPath: string) {
    loading.value = true
    try {
      stagedFiles.value = await invoke<FileDiff[]>('get_staged_diff', { repoPath })
      unstagedFiles.value = await invoke<FileDiff[]>('get_working_diff', { repoPath })
    } catch (e) {
      console.error('staging refresh error:', e)
    } finally {
      loading.value = false
    }
  }

  async function stageFiles(repoPath: string, paths: string[]) {
    await invoke('stage_files', { repoPath, paths })
  }

  async function unstageFiles(repoPath: string, paths: string[]) {
    await invoke('unstage_files', { repoPath, paths })
  }

  return { stagedFiles, unstagedFiles, loading, refresh, stageFiles, unstageFiles }
})
