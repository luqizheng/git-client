import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { BlameResult } from '../types/git'
import { blameFile } from '../utils/ipc'

export const useBlameStore = defineStore('blame', () => {
  // State
  const blameData = ref<Map<string, BlameResult>>(new Map())
  const loading = ref(false)
  const error = ref<string | null>(null)
  const visible = ref(false)

  // Getters
  const getBlameForFile = computed(() => (repoPath: string, filePath: string) => {
    const key = `${repoPath}:${filePath}`
    return blameData.value.get(key) || null
  })

  const isLoading = computed(() => loading.value)
  const isVisible = computed(() => visible.value)

  // Actions
  async function fetchBlame(repoPath: string, filePath: string, commitId?: string) {
    const key = `${repoPath}:${filePath}`
    loading.value = true
    error.value = null

    try {
      const result = await blameFile(repoPath, filePath, commitId)
      blameData.value.set(key, result)
      return result
    } catch (e) {
      error.value = String(e)
      throw e
    } finally {
      loading.value = false
    }
  }

  function clearBlame(repoPath: string, filePath: string) {
    const key = `${repoPath}:${filePath}`
    blameData.value.delete(key)
  }

  function toggleVisibility() {
    visible.value = !visible.value
  }

  function show() {
    visible.value = true
  }

  function hide() {
    visible.value = false
  }

  return {
    blameData,
    loading,
    error,
    visible,
    getBlameForFile,
    isLoading,
    isVisible,
    fetchBlame,
    clearBlame,
    toggleVisibility,
    show,
    hide,
  }
})
