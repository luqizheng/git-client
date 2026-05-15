import { ref, computed, type Ref } from 'vue'
import type { Commit } from '../../../types/git'

export interface TimeGroup {
  key: string
  label: string
  count: number
  firstCommitIndex: number
}

export type VirtualItem =
  | { type: 'commit'; commit: Commit; height: number }
  | { type: 'group'; group: TimeGroup; height: number }

export const COMMIT_ROW_HEIGHT = 40
export const GROUP_HEADER_HEIGHT = 28

export function createVirtualItems(
  commits: Commit[],
  groups: TimeGroup[],
  collapsedGroups: Set<string> = new Set(),
): VirtualItem[] {
  const items: VirtualItem[] = []
  let groupIdx = 0
  for (let i = 0; i < commits.length; i++) {
    if (groupIdx < groups.length && groups[groupIdx].firstCommitIndex === i) {
      const group = groups[groupIdx]
      items.push({ type: 'group', group, height: GROUP_HEADER_HEIGHT })
      groupIdx++
      if (collapsedGroups.has(group.key)) continue
    }
    if (groupIdx > 0 && collapsedGroups.has(groups[groupIdx - 1].key)) continue
    items.push({ type: 'commit', commit: commits[i], height: COMMIT_ROW_HEIGHT })
  }
  return items
}

export function useVirtualScroll(
  containerRef: Ref<HTMLElement | null>,
  items: Ref<VirtualItem[]>,
) {
  const scrollTop = ref(0)
  const containerHeight = ref(600)
  const BUFFER_PX = 200

  const offsetMap = computed(() => {
    const map: number[] = []
    let acc = 0
    for (const item of items.value) {
      map.push(acc)
      acc += item.height
    }
    return map
  })

  const totalHeight = computed(() => {
    if (offsetMap.value.length === 0) return 0
    const lastIdx = items.value.length - 1
    return offsetMap.value[lastIdx] + (items.value[lastIdx]?.height ?? 0)
  })

  const visibleRange = computed(() => {
    const top = scrollTop.value - BUFFER_PX
    const bottom = scrollTop.value + containerHeight.value + BUFFER_PX
    const map = offsetMap.value
    let start = 0
    let end = items.value.length - 1

    for (let i = 0; i < map.length; i++) {
      if (map[i] + items.value[i].height >= top) { start = i; break }
    }
    for (let i = map.length - 1; i >= 0; i--) {
      if (map[i] <= bottom) { end = i; break }
    }

    return { start: Math.max(0, start), end: Math.min(items.value.length - 1, end) }
  })

  const visibleItems = computed(() => {
    const { start, end } = visibleRange.value
    return items.value.slice(start, end + 1).map((item, i) => ({
      ...item,
      offset: offsetMap.value[start + i],
    }))
  })

  function handleScroll(e: Event) {
    scrollTop.value = (e.target as HTMLElement).scrollTop
  }

  function updateContainerHeight() {
    if (containerRef.value) {
      containerHeight.value = containerRef.value.clientHeight
    }
  }

  function scrollToIndex(index: number) {
    if (!containerRef.value) return
    const offset = offsetMap.value[index]
    if (offset !== undefined) {
      const target = offset - (containerHeight.value / 2) + (items.value[index]?.height ?? 40) / 2
      containerRef.value.scrollTop = Math.max(0, target)
    }
  }

  return {
    scrollTop,
    containerHeight,
    visibleRange,
    visibleItems,
    totalHeight,
    offsetMap,
    handleScroll,
    updateContainerHeight,
    scrollToIndex,
  }
}
