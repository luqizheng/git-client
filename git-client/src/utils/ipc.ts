declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown
  }
}

const mockData: Record<string, unknown> = {
  open_repo: { path: '/mock/repo', head_branch: 'main', head_commit_id: 'abc123', is_bare: false, is_empty: false },
  get_log: [],
  list_branches: [{ name: 'main', is_remote: false, is_head: true, target_commit_id: 'abc123', upstream: null }],
  list_remotes: [{ name: 'origin', url: 'https://github.com/user/repo.git', push_url: null }],
  load_settings: { theme: 'dark', sidebarWidth: 250, sidebarCollapsed: false, language: 'en' },
}

let isTauriAvailable: boolean | null = null

function checkTauri(): boolean {
  if (isTauriAvailable !== null) return isTauriAvailable
  try {
    const { invoke: _ } = require('@tauri-apps/api/core')
    isTauriAvailable = true
    return true
  } catch {
    isTauriAvailable = false
    return false
  }
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
