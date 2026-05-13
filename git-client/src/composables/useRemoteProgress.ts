import { ref, onUnmounted } from 'vue'
import { onEvent } from '../utils/event'
import type { FetchProgress, PushProgress } from '../types/ipc'

export interface RemoteProgress {
  isActive: boolean
  stage: string
  phase: string
  progress: number
  bytes: string
  type: 'fetch' | 'push' | null
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export function useRemoteProgress() {
  const progress = ref<RemoteProgress>({
    isActive: false,
    stage: '',
    phase: '',
    progress: 0,
    bytes: '0 B',
    type: null
  })

  let unlistenFetch: (() => void) | null = null
  let unlistenPush: (() => void) | null = null

  async function startListening() {
    unlistenFetch = await onEvent('fetch-progress', (payload) => {
      const data = payload as FetchProgress
      const prog = data.total ? (data.processed / data.total) * 100 : 0
      progress.value = {
        isActive: data.stage !== 'complete',
        stage: data.stage,
        phase: data.phase,
        progress: prog,
        bytes: formatBytes(data.bytesProcessed),
        type: 'fetch'
      }
    })

    unlistenPush = await onEvent('push-progress', (payload) => {
      const data = payload as PushProgress
      const prog = data.total ? (data.processed / data.total) * 100 : 0
      progress.value = {
        isActive: data.stage !== 'complete',
        stage: data.stage,
        phase: data.phase,
        progress: prog,
        bytes: formatBytes(data.bytesProcessed),
        type: 'push'
      }
    })
  }

  function stopListening() {
    unlistenFetch?.()
    unlistenPush?.()
    progress.value = {
      isActive: false,
      stage: '',
      phase: '',
      progress: 0,
      bytes: '0 B',
      type: null
    }
  }

  startListening()

  onUnmounted(() => {
    stopListening()
  })

  return {
    progress,
    stopListening
  }
}
