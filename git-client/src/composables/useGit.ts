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
