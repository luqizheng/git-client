import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { RemoteInfo, FetchResult, PullResult, PushResult } from '../types/git'
import { invoke } from '../utils/ipc'

export const useRemoteStore = defineStore('remote', () => {
  const remoteStates = ref<Map<string, RemoteInfo[]>>(new Map())
  const loadingStates = ref<Map<string, boolean>>(new Map())
  const syncingStates = ref<Map<string, boolean>>(new Map())

  function getRemotes(repoPath: string): RemoteInfo[] {
    return remoteStates.value.get(repoPath) ?? []
  }

  function isLoading(repoPath: string): boolean {
    return loadingStates.value.get(repoPath) ?? false
  }

  function isSyncing(repoPath: string): boolean {
    return syncingStates.value.get(repoPath) ?? false
  }

  async function fetchRemotes(repoPath: string) {
    loadingStates.value.set(repoPath, true)
    try {
      const remotes = await invoke<RemoteInfo[]>('list_remotes', { repoPath })
      remoteStates.value.set(repoPath, remotes)
    } catch (e) {
      console.error('fetchRemotes error:', e)
    } finally {
      loadingStates.value.set(repoPath, false)
    }
  }

  async function addRemote(repoPath: string, name: string, url: string) {
    await invoke('add_remote', { repoPath, name, url })
    await fetchRemotes(repoPath)
  }

  async function fetchRemote(repoPath: string, remote: string) {
    syncingStates.value.set(repoPath, true)
    try {
      return await invoke<FetchResult>('fetch', { repoPath, remote })
    } finally {
      syncingStates.value.set(repoPath, false)
    }
  }

  async function pullRemote(repoPath: string, remote: string, branch: string) {
    syncingStates.value.set(repoPath, true)
    try {
      return await invoke<PullResult>('pull', { repoPath, remote, branch })
    } finally {
      syncingStates.value.set(repoPath, false)
    }
  }

  async function pushRemote(repoPath: string, remote: string, branch: string) {
    syncingStates.value.set(repoPath, true)
    try {
      return await invoke<PushResult>('push', { repoPath, remote, branch })
    } finally {
      syncingStates.value.set(repoPath, false)
    }
  }

  function clearState(repoPath: string) {
    remoteStates.value.delete(repoPath)
    loadingStates.value.delete(repoPath)
    syncingStates.value.delete(repoPath)
  }

  return {
    remoteStates, loadingStates, syncingStates,
    getRemotes, isLoading, isSyncing,
    fetchRemotes, addRemote, fetchRemote, pullRemote, pushRemote, clearState,
  }
})
