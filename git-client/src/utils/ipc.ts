declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown
  }
}

const mockData: Record<string, unknown> = {
  open_repo: { path: '/mock/repo', head_branch: 'main', head_commit_id: 'abc123', is_bare: false, is_empty: false },
  get_log: [],
  search_commits: [],
  close_repo: null,
  list_branches: [{ name: 'main', is_remote: false, is_head: true, target_commit_id: 'abc123', upstream: null }],
  list_remotes: [{ name: 'origin', url: 'https://github.com/user/repo.git', push_url: null }],
  load_settings: { theme: 'dark', sidebarWidth: 250, sidebarCollapsed: false, language: 'en' },
  blame_file: {
    file_path: 'test.txt',
    lines: [
      {
        line_number: 1,
        commit_id: 'abc123def456',
        author: 'Test Author',
        author_email: 'test@example.com',
        timestamp: Math.floor(Date.now() / 1000),
        summary: 'Initial commit',
        is_boundary: false,
      },
    ],
  },
}

function checkTauri(): boolean {
  return !!window.__TAURI_INTERNALS__
}

export async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!checkTauri()) {
    return (mockData[cmd] ?? {}) as T
  }
  try {
    const { invoke: tauriInvoke } = await import('@tauri-apps/api/core')
    return await tauriInvoke(cmd, args)
  } catch (e) {
    console.warn(`IPC invoke ${cmd} failed, using mock:`, e)
    return (mockData[cmd] ?? {}) as T
  }
}

import type { BlameResult } from '../types/git'

export async function blameFile(
  repoPath: string,
  filePath: string,
  commitId?: string
): Promise<BlameResult> {
  return invoke<BlameResult>('blame_file', { repoPath, filePath, commitId })
}
