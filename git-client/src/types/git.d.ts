export interface Commit {
  id: string
  message: string
  author: string
  author_email: string
  time: number
  parent_ids: string[]
}

export interface Branch {
  name: string
  is_current: boolean
  is_remote: boolean
  target: string | null
}

export interface Remote {
  name: string
  url: string
}

export interface DiffHunk {
  header: string
  lines: DiffLine[]
}

export interface DiffLine {
  type: 'context' | 'add' | 'delete'
  content: string
  old_ln: number | null
  new_ln: number | null
}

export interface DiffFile {
  path: string
  old_path: string | null
  is_binary: boolean
  hunks: DiffHunk[]
}

export interface RepoState {
  path: string
  head_branch: string | null
  head_commit_id: string | null
  is_bare: boolean
  is_empty: boolean
}

export interface StatusItem {
  path: string
  status: 'modified' | 'added' | 'deleted' | 'renamed' | 'copied' | 'untracked' | 'ignored' | 'conflicted'
  staged: boolean
}
