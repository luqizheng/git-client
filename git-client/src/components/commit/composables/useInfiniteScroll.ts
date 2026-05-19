import { type Ref } from 'vue'

interface UseInfiniteScrollOptions {
  threshold: number
  onLoadMore: () => void
  debounceMs?: number
}

export function useInfiniteScroll(
  scrollContainer: Ref<HTMLElement | null>,
  options: UseInfiniteScrollOptions,
) {
  const debounceMs = options.debounceMs ?? 150
  let timer: ReturnType<typeof setTimeout> | null = null

  function onScroll() {
    const el = scrollContainer.value
    if (!el) return
    const { scrollTop, scrollHeight, clientHeight } = el
    if (scrollHeight - scrollTop - clientHeight < options.threshold) {
      if (timer) clearTimeout(timer)
      timer = setTimeout(options.onLoadMore, debounceMs)
    }
  }

  function cleanup() {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  return { onScroll, cleanup }
}