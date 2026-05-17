import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Submodule } from '../types/git'
import { invoke } from '../utils/ipc'

export const useSubmoduleStore = defineStore('submodule', () => {
  const submodules = ref<Submodule[]>([])

  async function listSubmodules(repoPath: string) {
    submodules.value = await invoke<Submodule[]>('list_submodules', { repo_path: repoPath })
    return submodules.value
  }

  async function initSubmodule(repoPath: string, name: string) {
    await invoke<null>('init_submodule', { repo_path: repoPath, name })
    await listSubmodules(repoPath)
  }

  async function updateSubmodule(repoPath: string, name: string, recursive = false) {
    await invoke<null>('update_submodule', { repo_path: repoPath, name, recursive })
    await listSubmodules(repoPath)
  }

  return { submodules, listSubmodules, initSubmodule, updateSubmodule }
})