import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Worktree } from '../types/git'
import { invoke } from '../utils/ipc'

export const useWorktreeStore = defineStore('worktree', () => {
  const worktrees = ref<Worktree[]>([])

  async function listWorktrees(repoPath: string) {
    worktrees.value = await invoke<Worktree[]>('list_worktrees', { repo_path: repoPath })
    return worktrees.value
  }

  async function addWorktree(repoPath: string, path: string, branch?: string) {
    await invoke<null>('add_worktree', { repo_path: repoPath, path, branch })
    await listWorktrees(repoPath)
  }

  async function removeWorktree(repoPath: string, path: string) {
    await invoke<null>('remove_worktree', { repo_path: repoPath, path })
    await listWorktrees(repoPath)
  }

  return { worktrees, listWorktrees, addWorktree, removeWorktree }
})
