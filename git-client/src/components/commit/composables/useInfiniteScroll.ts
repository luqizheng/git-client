import { type Ref } from 'vue'

export function useInfiniteScroll(
  scrollContainer: Ref<HTMLElement | null>,
  options: {
    threshold: number
    onLoadMore: () => void
  },
) {
  function onScroll() {
    const el = scrollContainer.value
    if (!el) return
    const { scrollTop, scrollHeight, clientHeight } = el
    if (scrollHeight - scrollTop - clientHeight < options.threshold) {
      options.onLoadMore()
    }
  }

  return { onScroll }
}
