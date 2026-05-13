const isMock = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_MOCK) === 'true'

export async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (isMock) return {} as T
  const { invoke: tauriInvoke } = await import('@tauri-apps/api/core')
  return tauriInvoke(cmd, args)
}
