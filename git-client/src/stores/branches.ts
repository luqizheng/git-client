import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Branch } from '../types/git'
import { invoke } from '../utils/ipc'

export const useBranchesStore = defineStore('branches', () => {
  const branches = ref<Branch[]>([])
  const currentBranch = ref<string>('')
  const loading = ref(false)

  async function fetchBranches(repoPath: string) {
    loading.value = true
    try {
      branches.value = await invoke<Branch[]>('list_branches', { repoPath })
      const head = branches.value.find(b => b.is_head)
      currentBranch.value = head?.name ?? ''
    } catch (e) {
      console.error('fetchBranches error:', e)
    } finally {
      loading.value = false
    }
  }

  async function createBranch(repoPath: string, name: string, checkout: boolean) {
    await invoke('create_branch', { repoPath, name, checkout })
    await fetchBranches(repoPath)
  }

  async function switchBranch(repoPath: string, name: string) {
    await invoke('switch_branch', { repoPath, name })
    await fetchBranches(repoPath)
  }

  async function deleteBranch(repoPath: string, name: string, force: boolean) {
    await invoke('delete_branch', { repoPath, name, force })
    await fetchBranches(repoPath)
  }

  return { branches, currentBranch, loading, fetchBranches, createBranch, switchBranch, deleteBranch }
})
