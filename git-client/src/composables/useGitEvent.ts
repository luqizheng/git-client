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
