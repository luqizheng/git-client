import { ref, watch, type Ref } from 'vue'

export interface InfiniteScrollOptions {
  threshold?: number
  onLoadMore: () => Promise<void>
  hasMore: Ref<boolean>
  loading: Ref<boolean>
}

export function useInfiniteScroll(
  containerRef: Ref<HTMLElement | null>,
  options: InfiniteScrollOptions
) {
  const { threshold = 100, onLoadMore, hasMore, loading } = options
  const isLoading = ref(false)

  async function checkAndLoad() {
    if (!containerRef.value || loading.value || isLoading.value || !hasMore.value) return

    const container = containerRef.value
    const scrollBottom = container.scrollTop + container.clientHeight
    const scrollHeight = container.scrollHeight

    if (scrollHeight - scrollBottom < threshold) {
      isLoading.value = true
      try {
        await onLoadMore()
      } finally {
        isLoading.value = false
      }
    }
  }

  function handleScroll() {
    checkAndLoad()
  }

  watch([hasMore, loading], () => {
    if (hasMore.value && !loading.value) {
      checkAndLoad()
    }
  })

  return {
    isLoading,
    handleScroll,
    checkAndLoad,
  }
}
