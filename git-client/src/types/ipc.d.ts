import type { Commit, Branch, Remote, DiffFile, RepoState, StatusItem } from './git'

export { Commit, Branch, Remote, DiffFile, RepoState, StatusItem }

export interface InvokeResult<T> {
  ok: T | null
  err: string | null
}

export interface RepoOpenResult extends InvokeResult<RepoState> {}

export interface BranchListResult extends InvokeResult<Branch[]> {}

export interface CommitListResult extends InvokeResult<Commit[]> {}

export interface DiffResult extends InvokeResult<DiffFile[]> {}

export interface StatusResult extends InvokeResult<StatusItem[]> {}

export interface CloneOptions {
  url: string
  path: string
  branch?: string
  depth?: number
}

export interface CommitOptions {
  message: string
  author?: string
  amend?: boolean
}

export interface BranchCreateOptions {
  name: string
  start_point?: string
  force?: boolean
}

export interface PullOptions {
  remote?: string
  branch?: string
}

export interface PushOptions {
  remote?: string
  branch?: string
  force?: boolean
  set_upstream?: boolean
}
