export interface IpcResult<T> {
  ok: boolean
  data: T | null
  error: string | null
}

export type GitEvent =
  | 'ref-updated'
  | 'index-changed'
  | 'workdir-changed'
  | 'head-changed'
  | 'fetch-progress'
  | 'push-progress'
  | 'merge-conflict'
  | 'auth-required'

export interface FetchProgress {
  remote: string
  stage: 'connecting' | 'authenticating' | 'enumerating' | 'receiving' | 'resolving' | 'complete'
  phase: string
  processed: number
  total: number | null
  bytesProcessed: number
  bytesTotal: number | null
}

export interface PushProgress {
  remote: string
  branch: string
  stage: 'connecting' | 'authenticating' | 'updating' | 'complete'
  phase: string
  processed: number
  total: number
  bytesProcessed: number
  bytesTotal: number
}
