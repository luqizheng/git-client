import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { RemoteInfo, FetchResult, PullResult, PushResult } from '../types/git'
import { invoke } from '../utils/ipc'

export const useRemoteStore = defineStore('remote', () => {
  const remotes = ref<RemoteInfo[]>([])
  const loading = ref(false)
  const syncing = ref(false)

  async function fetchRemotes(repoPath: string) {
    loading.value = true
    try {
      remotes.value = await invoke<RemoteInfo[]>('list_remotes', { repoPath })
    } catch (e) {
      console.error('fetchRemotes error:', e)
    } finally {
      loading.value = false
    }
  }

  async function addRemote(repoPath: string, name: string, url: string) {
    await invoke('add_remote', { repoPath, name, url })
    await fetchRemotes(repoPath)
  }

  async function fetchRemote(repoPath: string, remote: string) {
    syncing.value = true
    try {
      return await invoke<FetchResult>('fetch', { repoPath, remote })
    } finally {
      syncing.value = false
    }
  }

  async function pullRemote(repoPath: string, remote: string, branch: string) {
    syncing.value = true
    try {
      return await invoke<PullResult>('pull', { repoPath, remote, branch })
    } finally {
      syncing.value = false
    }
  }

  async function pushRemote(repoPath: string, remote: string, branch: string) {
    syncing.value = true
    try {
      return await invoke<PushResult>('push', { repoPath, remote, branch })
    } finally {
      syncing.value = false
    }
  }

  return { remotes, loading, syncing, fetchRemotes, addRemote, fetchRemote, pullRemote, pushRemote }
})
