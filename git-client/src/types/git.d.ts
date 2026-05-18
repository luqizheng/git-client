export interface CommitRef {
  name: string
  ref_type: 'local' | 'remote' | 'tag'
  is_head: boolean
}

export interface Commit {
  id: string
  message: string
  author: string
  author_email: string
  time: number
  parent_ids: string[]
  refs: CommitRef[]
}

export type SearchFilter = 'all' | 'message' | 'author' | 'hash' | 'file'

export interface OpenRepo {
  state: RepoState
  commits: Commit[]
  branches: Branch[]
  selectedCommit: Commit | null
  hasMore: boolean
  loading: boolean
}

export interface Branch {
  name: string
  is_remote: boolean
  is_head: boolean
  target_commit_id: string
  upstream: string | null
}

export interface FileDiff {
  path: string
  old_path: string | null
  status: DiffStatus
  hunks: Hunk[]
}

export type DiffStatus = 'Added' | 'Modified' | 'Deleted' | 'Renamed' | 'Copied'

export interface Hunk {
  old_start: number
  old_lines: number
  new_start: number
  new_lines: number
  lines: DiffLine[]
}

export type DiffLine =
  | { Context: string }
  | { Addition: string }
  | { Deletion: string }

export interface RepoState {
  path: string
  head_branch: string | null
  head_commit_id: string | null
  is_bare: boolean
  is_empty: boolean
}

export interface RemoteInfo {
  name: string
  url: string
  push_url: string | null
}

export interface StashEntry {
  index: number
  message: string
  commit_id: string
}

export interface ConflictFile {
  path: string
  ours_modified: boolean
  theirs_modified: boolean
}

export interface Credential {
  username: string
  password: string | null
  ssh_key_path: string | null
}

export interface FetchResult {
  remote: string
  updated: boolean
}

export interface PullResult {
  remote: string
  branch: string
  had_conflicts: boolean
}

export interface PushResult {
  remote: string
  branch: string
}

export interface MergeResult {
  branch: string
  had_conflicts: boolean
  conflicts: ConflictFile[]
}

export interface CherryPickResult {
  commit_id: string
  had_conflicts: boolean
  conflicts: ConflictFile[]
}

export interface FileContent {
  old_content: string | null
  new_content: string | null
  old_path: string | null
  new_path: string | null
  hunks: Hunk[]
}

export interface Tag {
  name: string
  target: string
  message?: string
  tagger?: string
  date?: string
}

export interface Submodule {
  name: string
  path: string
  url: string
  branch?: string
  sha: string
  is_initialized: boolean
}

export interface BlameLine {
  line_number: number
  commit_id: string
  author: string
  author_email: string
  timestamp: number
  summary: string
  is_boundary: boolean
}

export interface BlameResult {
  file_path: string
  lines: BlameLine[]
}

export interface Worktree {
  id: string
  path: string
  branch: string
  commit: string
  is_prunable: boolean
}
