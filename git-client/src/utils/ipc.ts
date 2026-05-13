const isMock = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_MOCK) === 'true'

const mockData: Record<string, unknown> = {
  open_repo: { path: '/mock/repo', head_branch: 'main', head_commit_id: 'abc123', is_bare: false, is_empty: false },
  get_log: [],
  list_branches: [{ name: 'main', is_remote: false, is_head: true, target_commit_id: 'abc123', upstream: null }],
  list_remotes: [{ name: 'origin', url: 'https://github.com/user/repo.git', push_url: null }],
}

export async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (isMock) return (mockData[cmd] ?? {}) as T
  const { invoke: tauriInvoke } = await import('@tauri-apps/api/core')
  return tauriInvoke(cmd, args)
}
