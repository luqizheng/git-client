import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { RepoState } from '../types/git'
import { invoke } from '../utils/ipc'

export const useRepoStore = defineStore('repo', () => {
  const currentRepo = ref<RepoState | null>(null)
  const repoPath = ref<string>('')
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function openRepo(path: string) {
    loading.value = true
    error.value = null
    try {
      const state = await invoke<RepoState>('open_repo', { path })
      currentRepo.value = state
      repoPath.value = path
    } catch (e) {
      error.value = String(e)
    } finally {
      loading.value = false
    }
  }

  async function initRepo(path: string, bare: boolean) {
    loading.value = true
    try {
      const state = await invoke<RepoState>('init_repo', { path, bare })
      currentRepo.value = state
      repoPath.value = path
    } catch (e) {
      error.value = String(e)
    } finally {
      loading.value = false
    }
  }

  async function cloneRepo(url: string, path: string) {
    loading.value = true
    try {
      const state = await invoke<RepoState>('clone_repo', { url, path })
      currentRepo.value = state
      repoPath.value = path
    } catch (e) {
      error.value = String(e)
    } finally {
      loading.value = false
    }
  }

  return { currentRepo, repoPath, loading, error, openRepo, initRepo, cloneRepo }
})
