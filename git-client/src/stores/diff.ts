import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { FileDiff } from '../types/git'
import { invoke } from '../utils/ipc'

export const useDiffStore = defineStore('diff', () => {
  const diffs = ref<FileDiff[]>([])
  const selectedFile = ref<string | null>(null)
  const loading = ref(false)

  async function fetchCommitDiff(repoPath: string, commitId: string) {
    loading.value = true
    try {
      diffs.value = await invoke<FileDiff[]>('get_diff', { repoPath, commitId })
    } catch (e) {
      console.error('fetchCommitDiff error:', e)
    } finally {
      loading.value = false
    }
  }

  async function fetchWorkingDiff(repoPath: string) {
    loading.value = true
    try {
      diffs.value = await invoke<FileDiff[]>('get_working_diff', { repoPath })
    } catch (e) {
      console.error('fetchWorkingDiff error:', e)
    } finally {
      loading.value = false
    }
  }

  async function fetchStagedDiff(repoPath: string) {
    loading.value = true
    try {
      diffs.value = await invoke<FileDiff[]>('get_staged_diff', { repoPath })
    } catch (e) {
      console.error('fetchStagedDiff error:', e)
    } finally {
      loading.value = false
    }
  }

  function selectFile(path: string | null) {
    selectedFile.value = path
  }

  return { diffs, selectedFile, loading, fetchCommitDiff, fetchWorkingDiff, fetchStagedDiff, selectFile }
})
