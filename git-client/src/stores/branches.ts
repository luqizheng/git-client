import { defineStore } from 'pinia'
import type { Branch } from '../types/git'
import { invoke } from '../utils/ipc'
import { useRepoStore } from './repo'

export const useBranchesStore = defineStore('branches', () => {
  async function fetchBranches(repoPath: string) {
    const repo = useRepoStore()
    const openRepo = repo.openRepos.get(repoPath)
    if (!openRepo) return
    try {
      openRepo.branches = await invoke<Branch[]>('list_branches', { repoPath })
    } catch (e) {
      console.error('fetchBranches error:', e)
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

  function currentBranch(repoPath: string): string {
    const repo = useRepoStore()
    const openRepo = repo.openRepos.get(repoPath)
    if (!openRepo) return ''
    const head = openRepo.branches.find(b => b.is_head)
    return head?.name ?? ''
  }

  return { fetchBranches, createBranch, switchBranch, deleteBranch, currentBranch }
})
