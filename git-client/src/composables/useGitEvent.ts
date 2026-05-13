import { ref, onMounted, onUnmounted } from 'vue'
import { onEvent } from '../utils/event'

export function useGitEvent(event: string, handler: (payload: unknown) => void) {
  const unlisten = ref<(() => void) | null>(null)

  onMounted(async () => {
    try {
      unlisten.value = await onEvent(event, handler)
    } catch (e) {
      console.warn(`Failed to listen for ${event}:`, e)
    }
  })

  onUnmounted(() => {
    unlisten.value?.()
  })
}
