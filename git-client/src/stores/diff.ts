import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { FileDiff } from '../types/git'
import { invoke } from '../utils/ipc'

export const useDiffStore = defineStore('diff', () => {
  const diffStates = ref<Map<string, FileDiff[]>>(new Map())
  const selectedFiles = ref<Map<string, string | null>>(new Map())
  const loadingStates = ref<Map<string, boolean>>(new Map())

  function getDiffs(repoPath: string): FileDiff[] {
    return diffStates.value.get(repoPath) ?? []
  }

  function getSelectedFile(repoPath: string): string | null {
    return selectedFiles.value.get(repoPath) ?? null
  }

  function selectFile(repoPath: string, filePath: string | null) {
    selectedFiles.value.set(repoPath, filePath)
  }

  async function fetchCommitDiff(repoPath: string, commitId: string) {
    loadingStates.value.set(repoPath, true)
    try {
      const diffs = await invoke<FileDiff[]>('get_diff', { repoPath, commitId })
      diffStates.value.set(repoPath, diffs)
    } catch (e) {
      console.error('fetchCommitDiff error:', e)
    } finally {
      loadingStates.value.set(repoPath, false)
    }
  }

  async function fetchWorkingDiff(repoPath: string) {
    loadingStates.value.set(repoPath, true)
    try {
      const diffs = await invoke<FileDiff[]>('get_working_diff', { repoPath })
      diffStates.value.set(repoPath, diffs)
    } catch (e) {
      console.error('fetchWorkingDiff error:', e)
    } finally {
      loadingStates.value.set(repoPath, false)
    }
  }

  async function fetchStagedDiff(repoPath: string) {
    loadingStates.value.set(repoPath, true)
    try {
      const diffs = await invoke<FileDiff[]>('get_staged_diff', { repoPath })
      diffStates.value.set(repoPath, diffs)
    } catch (e) {
      console.error('fetchStagedDiff error:', e)
    } finally {
      loadingStates.value.set(repoPath, false)
    }
  }

  function clearState(repoPath: string) {
    diffStates.value.delete(repoPath)
    selectedFiles.value.delete(repoPath)
    loadingStates.value.delete(repoPath)
  }

  return {
    diffStates, selectedFiles, loadingStates,
    getDiffs, getSelectedFile, selectFile,
    fetchCommitDiff, fetchWorkingDiff, fetchStagedDiff, clearState,
  }
})
