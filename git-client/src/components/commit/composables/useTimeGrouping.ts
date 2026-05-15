import { computed, type Ref } from 'vue'
import type { Commit } from '../../../types/git'
import type { TimeGroup } from './useVirtualScroll'

function getTimeGroup(timestamp: number): { key: string; label: string } {
  const now = new Date()
  const date = new Date(timestamp * 1000)
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000)

  if (diffDays === 0) return { key: 'today', label: 'Today' }
  if (diffDays === 1) return { key: 'yesterday', label: 'Yesterday' }
  if (diffDays < 7) return { key: 'this-week', label: 'This Week' }
  if (diffDays < 30) return { key: 'this-month', label: 'This Month' }
  const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  return { key: `older-${monthKey}`, label: `${date.getFullYear()}-${date.getMonth() + 1}` }
}

export function useTimeGrouping(commits: Ref<Commit[]>) {
  const groups = computed<TimeGroup[]>(() => {
    const result: TimeGroup[] = []
    let lastKey = ''

    for (let i = 0; i < commits.value.length; i++) {
      const commit = commits.value[i]
      const { key, label } = getTimeGroup(commit.time)

      if (key !== lastKey) {
        result.push({ key, label, count: 1, firstCommitIndex: i })
        lastKey = key
      } else {
        result[result.length - 1].count++
      }
    }

    return result
  })

  return { groups }
}
