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
  | 'merge-conflict'
  | 'auth-required'
