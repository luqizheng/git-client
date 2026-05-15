import { ref, computed, type Ref } from 'vue'
import type { Commit } from '../../../types/git'
import { matchesFilter } from '../utils/commitHelpers'

export function useFilterGroup(commits: Ref<Commit[]>) {
  const filterText = ref('')
  const filterType = ref<'all' | 'message' | 'author' | 'hash'>('all')

  const filteredCommits = computed(() => {
    if (!filterText.value.trim()) return commits.value
    return commits.value.filter(c =>
      matchesFilter(c, filterText.value.trim(), filterType.value),
    )
  })

  return {
    filterText,
    filterType,
    filteredCommits,
  }
}
