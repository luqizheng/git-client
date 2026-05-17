import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { FileDiff, FileContent } from '../types/git'
import { invoke } from '../utils/ipc'

export const useDiffStore = defineStore('diff', () => {
  const diffStates = ref<Map<string, FileDiff[]>>(new Map())
  const selectedFiles = ref<Map<string, string | null>>(new Map())
  const loadingStates = ref<Map<string, boolean>>(new Map())
  const fileContents = ref<Map<string, FileContent | null>>(new Map())

  function getDiffs(repoPath: string): FileDiff[] {
    return diffStates.value.get(repoPath) ?? []
  }

  function getSelectedFile(repoPath: string): string | null {
    return selectedFiles.value.get(repoPath) ?? null
  }

  function selectFile(repoPath: string, filePath: string | null) {
    selectedFiles.value.set(repoPath, filePath)
    if (!filePath) {
      fileContents.value.delete(repoPath)
    }
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

  async function fetchFileContent(repoPath: string, commitId: string, filePath: string) {
    try {
      const content = await invoke<FileContent>('get_file_content', {
        repoPath,
        commitId,
        filePath,
      })
      fileContents.value.set(repoPath, content)
      return content
    } catch (e) {
      console.error('fetchFileContent error:', e)
      return null
    }
  }

  function getFileContent(repoPath: string): FileContent | null {
    return fileContents.value.get(repoPath) ?? null
  }

  function clearState(repoPath: string) {
    diffStates.value.delete(repoPath)
    selectedFiles.value.delete(repoPath)
    loadingStates.value.delete(repoPath)
    fileContents.value.delete(repoPath)
  }

  function clearSelectedFile(repoPath: string) {
    selectedFiles.value.delete(repoPath)
    fileContents.value.delete(repoPath)
  }

  return {
    diffStates, selectedFiles, loadingStates, fileContents,
    getDiffs, getSelectedFile, selectFile, clearSelectedFile,
    fetchCommitDiff, fetchWorkingDiff, fetchStagedDiff,
    fetchFileContent, getFileContent, clearState,
  }
})
