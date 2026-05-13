# Git客户端 实施计划 — 05: 前端基础 (Types/IPC/Store/Composables)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现前端TypeScript类型定义、IPC调用封装、7个Pinia Store、6个Composable

**Architecture:** types/定义与Rust models对应的TS接口。utils/ipc.ts封装invoke + mock模式。stores/按功能拆分为7个独立store。composables/封装可复用逻辑（事件监听、git操作、主题、国际化、快捷键、工作区监听）。

**Tech Stack:** Vue3, TypeScript, Pinia, @tauri-apps/api, vitest

---

### Task 1: 实现TypeScript类型定义

**Files:**
- Modify: `src/types/git.d.ts`
- Modify: `src/types/ipc.d.ts`

- [ ] **Step 1: 写git类型**

`src/types/git.d.ts`:
```typescript
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
```

- [ ] **Step 2: 写ipc类型**

`src/types/ipc.d.ts`:
```typescript
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
```

- [ ] **Step 3: 验证类型检查**

Run:
```powershell
cd d:\projects\req2task-2\git-client
npx vue-tsc --noEmit
```

Expected: 无类型错误

- [ ] **Step 4: Commit**

```bash
git add src/types/git.d.ts src/types/ipc.d.ts
git commit -m "feat: add TypeScript type definitions matching Rust models"
```

---

### Task 2: 实现IPC调用封装

**Files:**
- Modify: `src/utils/ipc.ts`
- Modify: `src/utils/event.ts`

- [ ] **Step 1: 写IPC封装**

`src/utils/ipc.ts`:
```typescript
const isMock = import.meta.env.VITE_MOCK === 'true'

const mockData: Record<string, unknown> = {
  open_repo: { path: '/mock/repo', head_branch: 'main', head_commit_id: 'abc123', is_bare: false, is_empty: false },
  get_log: [],
  list_branches: [{ name: 'main', is_remote: false, is_head: true, target_commit_id: 'abc123', upstream: null }],
  list_remotes: [{ name: 'origin', url: 'https://github.com/user/repo.git', push_url: null }],
}

export async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (isMock) return (mockData[cmd] ?? {}) as T
  return window.__TAURI_INTERNALS__.invoke(cmd, args)
}
```

- [ ] **Step 2: 写事件封装**

`src/utils/event.ts`:
```typescript
import { listen } from '@tauri-apps/api/event'

export async function onEvent(event: string, handler: (payload: unknown) => void) {
  return listen(event, (e) => handler(e.payload))
}
```

- [ ] **Step 3: Commit**

```bash
git add src/utils/ipc.ts src/utils/event.ts
git commit -m "feat: add IPC invoke wrapper with mock mode and event listener"
```

---

### Task 3: 实现Pinia Stores — repo + commits + branches

**Files:**
- Create: `src/stores/repo.ts`
- Create: `src/stores/commits.ts`
- Create: `src/stores/branches.ts`

- [ ] **Step 1: 写repo store**

`src/stores/repo.ts`:
```typescript
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { RepoState } from '../types/git'
import { invoke } from '../utils/ipc'

export const useRepoStore = defineStore('repo', () => {
  const currentRepo = ref<RepoState | null>(null)
  const repoPath = ref<string>('')
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function openRepo(path: string) {
    loading.value = true
    error.value = null
    try {
      const state = await invoke<RepoState>('open_repo', { path })
      currentRepo.value = state
      repoPath.value = path
    } catch (e) {
      error.value = String(e)
    } finally {
      loading.value = false
    }
  }

  async function initRepo(path: string, bare: boolean) {
    loading.value = true
    try {
      const state = await invoke<RepoState>('init_repo', { path, bare })
      currentRepo.value = state
      repoPath.value = path
    } catch (e) {
      error.value = String(e)
    } finally {
      loading.value = false
    }
  }

  async function cloneRepo(url: string, path: string) {
    loading.value = true
    try {
      const state = await invoke<RepoState>('clone_repo', { url, path })
      currentRepo.value = state
      repoPath.value = path
    } catch (e) {
      error.value = String(e)
    } finally {
      loading.value = false
    }
  }

  return { currentRepo, repoPath, loading, error, openRepo, initRepo, cloneRepo }
})
```

- [ ] **Step 2: 写commits store**

`src/stores/commits.ts`:
```typescript
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Commit } from '../types/git'
import { invoke } from '../utils/ipc'

export const useCommitsStore = defineStore('commits', () => {
  const commits = ref<Commit[]>([])
  const selectedCommit = ref<Commit | null>(null)
  const loading = ref(false)
  const hasMore = ref(true)

  async function fetchLogs(repoPath: string, limit = 50, after?: string) {
    loading.value = true
    try {
      const result = await invoke<Commit[]>('get_log', { repoPath, limit, after })
      if (after) {
        commits.value.push(...result)
      } else {
        commits.value = result
      }
      hasMore.value = result.length >= limit
    } catch (e) {
      console.error('fetchLogs error:', e)
    } finally {
      loading.value = false
    }
  }

  function selectCommit(commit: Commit | null) {
    selectedCommit.value = commit
  }

  function clearCommits() {
    commits.value = []
    selectedCommit.value = null
    hasMore.value = true
  }

  return { commits, selectedCommit, loading, hasMore, fetchLogs, selectCommit, clearCommits }
})
```

- [ ] **Step 3: 写branches store**

`src/stores/branches.ts`:
```typescript
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Branch } from '../types/git'
import { invoke } from '../utils/ipc'

export const useBranchesStore = defineStore('branches', () => {
  const branches = ref<Branch[]>([])
  const currentBranch = ref<string>('')
  const loading = ref(false)

  async function fetchBranches(repoPath: string) {
    loading.value = true
    try {
      branches.value = await invoke<Branch[]>('list_branches', { repoPath })
      const head = branches.value.find(b => b.is_head)
      currentBranch.value = head?.name ?? ''
    } catch (e) {
      console.error('fetchBranches error:', e)
    } finally {
      loading.value = false
    }
  }

  async function createBranch(repoPath: string, name: string, checkout: boolean) {
    await invoke('create_branch', { repoPath, name, checkout })
    await fetchBranches(repoPath)
  }

  async function switchBranch(repoPath: string, name: string) {
    await invoke('switch_branch', { repoPath, name })
    await fetchBranches(repoPath)
  }

  async function deleteBranch(repoPath: string, name: string, force: boolean) {
    await invoke('delete_branch', { repoPath, name, force })
    await fetchBranches(repoPath)
  }

  return { branches, currentBranch, loading, fetchBranches, createBranch, switchBranch, deleteBranch }
})
```

- [ ] **Step 4: Commit**

```bash
git add src/stores/repo.ts src/stores/commits.ts src/stores/branches.ts
git commit -m "feat: add Pinia stores for repo, commits, branches"
```

---

### Task 4: 实现Pinia Stores — diff + staging + remote + app

**Files:**
- Create: `src/stores/diff.ts`
- Create: `src/stores/staging.ts`
- Create: `src/stores/remote.ts`
- Modify: `src/stores/app.ts`

- [ ] **Step 1: 写diff store**

`src/stores/diff.ts`:
```typescript
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { FileDiff } from '../types/git'
import { invoke } from '../utils/ipc'

export const useDiffStore = defineStore('diff', () => {
  const diffs = ref<FileDiff[]>([])
  const selectedFile = ref<string | null>(null)
  const loading = ref(false)

  async function fetchCommitDiff(repoPath: string, commitId: string) {
    loading.value = true
    try {
      diffs.value = await invoke<FileDiff[]>('get_diff', { repoPath, commitId })
    } catch (e) {
      console.error('fetchCommitDiff error:', e)
    } finally {
      loading.value = false
    }
  }

  async function fetchWorkingDiff(repoPath: string) {
    loading.value = true
    try {
      diffs.value = await invoke<FileDiff[]>('get_working_diff', { repoPath })
    } catch (e) {
      console.error('fetchWorkingDiff error:', e)
    } finally {
      loading.value = false
    }
  }

  async function fetchStagedDiff(repoPath: string) {
    loading.value = true
    try {
      diffs.value = await invoke<FileDiff[]>('get_staged_diff', { repoPath })
    } catch (e) {
      console.error('fetchStagedDiff error:', e)
    } finally {
      loading.value = false
    }
  }

  function selectFile(path: string | null) {
    selectedFile.value = path
  }

  return { diffs, selectedFile, loading, fetchCommitDiff, fetchWorkingDiff, fetchStagedDiff, selectFile }
})
```

- [ ] **Step 2: 写staging store**

`src/stores/staging.ts`:
```typescript
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { FileDiff } from '../types/git'
import { invoke } from '../utils/ipc'

export const useStagingStore = defineStore('staging', () => {
  const stagedFiles = ref<FileDiff[]>([])
  const unstagedFiles = ref<FileDiff[]>([])
  const loading = ref(false)

  async function refresh(repoPath: string) {
    loading.value = true
    try {
      stagedFiles.value = await invoke<FileDiff[]>('get_staged_diff', { repoPath })
      unstagedFiles.value = await invoke<FileDiff[]>('get_working_diff', { repoPath })
    } catch (e) {
      console.error('staging refresh error:', e)
    } finally {
      loading.value = false
    }
  }

  async function stageFiles(repoPath: string, paths: string[]) {
    await invoke('stage_files', { repoPath, paths })
  }

  async function unstageFiles(repoPath: string, paths: string[]) {
    await invoke('unstage_files', { repoPath, paths })
  }

  return { stagedFiles, unstagedFiles, loading, refresh, stageFiles, unstageFiles }
})
```

- [ ] **Step 3: 写remote store**

`src/stores/remote.ts`:
```typescript
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
```

- [ ] **Step 4: 更新app store**

`src/stores/app.ts`:
```typescript
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  const theme = ref<'dark' | 'light'>('dark')
  const locale = ref<'zh' | 'en'>('zh')
  const sidebarWidth = ref(240)
  const sidebarCollapsed = ref(false)

  function setTheme(t: 'dark' | 'light') {
    theme.value = t
  }

  function setLocale(l: 'zh' | 'en') {
    locale.value = l
  }

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  return { theme, locale, sidebarWidth, sidebarCollapsed, setTheme, setLocale, toggleSidebar }
})
```

- [ ] **Step 5: Commit**

```bash
git add src/stores/
git commit -m "feat: add Pinia stores for diff, staging, remote, app"
```

---

### Task 5: 实现Composables — useGit + useGitEvent

**Files:**
- Create: `src/composables/useGit.ts`
- Create: `src/composables/useGitEvent.ts`

- [ ] **Step 1: 写useGit composable**

`src/composables/useGit.ts`:
```typescript
import { ref } from 'vue'
import { invoke } from '../utils/ipc'

export function useGit() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function call<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
    loading.value = true
    error.value = null
    try {
      return await invoke<T>(cmd, args)
    } catch (e) {
      error.value = String(e)
      throw e
    } finally {
      loading.value = false
    }
  }

  return { loading, error, call }
}
```

- [ ] **Step 2: 写useGitEvent composable**

`src/composables/useGitEvent.ts`:
```typescript
import { ref, onMounted, onUnmounted } from 'vue'
import { onEvent } from '../utils/event'

export function useGitEvent(event: string, handler: (payload: unknown) => void) {
  const unlisten = ref<(() => void) | null>(null)

  onMounted(async () => {
    unlisten.value = await onEvent(event, handler)
  })

  onUnmounted(() => {
    unlisten.value?.()
  })
}
```

- [ ] **Step 3: Commit**

```bash
git add src/composables/useGit.ts src/composables/useGitEvent.ts
git commit -m "feat: add useGit and useGitEvent composables"
```

---

### Task 6: 实现Composables — useWorkdirWatcher + useTheme + useI18n + useKeyboard

**Files:**
- Create: `src/composables/useWorkdirWatcher.ts`
- Create: `src/composables/useTheme.ts`
- Create: `src/composables/useI18n.ts`
- Create: `src/composables/useKeyboard.ts`

- [ ] **Step 1: 写useWorkdirWatcher**

`src/composables/useWorkdirWatcher.ts`:
```typescript
import { useGitEvent } from './useGitEvent'
import { useStagingStore } from '../stores/staging'
import { useDiffStore } from '../stores/diff'
import { useBranchesStore } from '../stores/branches'
import { useCommitsStore } from '../stores/commits'
import { useRepoStore } from '../stores/repo'

export function useWorkdirWatcher() {
  const staging = useStagingStore()
  const diff = useDiffStore()
  const branches = useBranchesStore()
  const commits = useCommitsStore()
  const repo = useRepoStore()

  let timer: number | null = null

  function debounce(fn: () => void, ms: number) {
    if (timer) clearTimeout(timer)
    timer = window.setTimeout(fn, ms)
  }

  useGitEvent('workdir-changed', () => {
    if (!repo.repoPath) return
    debounce(() => {
      staging.refresh(repo.repoPath)
      diff.fetchWorkingDiff(repo.repoPath)
    }, 300)
  })

  useGitEvent('index-changed', () => {
    if (!repo.repoPath) return
    debounce(() => {
      staging.refresh(repo.repoPath)
      diff.fetchStagedDiff(repo.repoPath)
    }, 300)
  })

  useGitEvent('ref-updated', () => {
    if (!repo.repoPath) return
    debounce(() => {
      branches.fetchBranches(repo.repoPath)
      commits.fetchLogs(repo.repoPath)
    }, 300)
  })

  useGitEvent('head-changed', () => {
    if (!repo.repoPath) return
    debounce(() => {
      branches.fetchBranches(repo.repoPath)
      commits.fetchLogs(repo.repoPath)
    }, 300)
  })
}
```

- [ ] **Step 2: 写useTheme**

`src/composables/useTheme.ts`:
```typescript
import { useAppStore } from '../stores/app'

export function useTheme() {
  const app = useAppStore()

  function applyTheme() {
    document.documentElement.setAttribute('data-theme', app.theme)
    if (app.theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  function toggleTheme() {
    app.setTheme(app.theme === 'dark' ? 'light' : 'dark')
    applyTheme()
  }

  return { theme: app.theme, toggleTheme, applyTheme }
}
```

- [ ] **Step 3: 写useI18n**

`src/composables/useI18n.ts`:
```typescript
import { useI18n as useVueI18n } from 'vue-i18n'

export function useI18nHelper() {
  const { t, locale } = useVueI18n()

  function setLocale(l: 'zh' | 'en') {
    locale.value = l
  }

  return { t, locale, setLocale }
}
```

- [ ] **Step 4: 写useKeyboard**

`src/composables/useKeyboard.ts`:
```typescript
import { onMounted, onUnmounted } from 'vue'

type ShortcutHandler = () => void

interface Shortcut {
  key: string
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  handler: ShortcutHandler
}

export function useKeyboard(shortcuts: Shortcut[]) {
  function onKeyDown(e: KeyboardEvent) {
    for (const s of shortcuts) {
      const ctrlMatch = s.ctrl ? (e.ctrlKey || e.metaKey) : !(e.ctrlKey || e.metaKey)
      const shiftMatch = s.shift ? e.shiftKey : !e.shiftKey
      const altMatch = s.alt ? e.altKey : !e.altKey
      if (ctrlMatch && shiftMatch && altMatch && e.key.toLowerCase() === s.key.toLowerCase()) {
        e.preventDefault()
        s.handler()
        return
      }
    }
  }

  onMounted(() => window.addEventListener('keydown', onKeyDown))
  onUnmounted(() => window.removeEventListener('keydown', onKeyDown))
}
```

- [ ] **Step 5: Commit**

```bash
git add src/composables/
git commit -m "feat: add useWorkdirWatcher, useTheme, useI18n, useKeyboard composables"
```
