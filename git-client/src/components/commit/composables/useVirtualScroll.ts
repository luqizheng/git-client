import { computed, type Ref } from 'vue'
import { useVirtualizer } from '@tanstack/vue-virtual'
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
  scrollContainerRef: Ref<HTMLElement | null>,
  virtualItems: Ref<VirtualItem[]>,
) {
  const rowVirtualizer = useVirtualizer({
    count: virtualItems.value.length,
    getScrollElement: () => scrollContainerRef.value,
    estimateSize: (index: number) => virtualItems.value[index]?.height ?? COMMIT_ROW_HEIGHT,
    overscan: 10,
  })

  const totalHeight = computed(() => rowVirtualizer.value.getTotalSize())

  const visibleItems = computed(() => {
    return rowVirtualizer.value.getVirtualItems().map(vi => {
      const item = virtualItems.value[vi.index]
      return {
        ...item,
        offset: vi.start,
        size: vi.size,
        key: vi.key,
      }
    })
  })

  function scrollToIndex(index: number) {
    rowVirtualizer.value.scrollToIndex(index, { align: 'center' })
  }

  return {
    rowVirtualizer,
    totalHeight,
    visibleItems,
    scrollToIndex,
  }
}
