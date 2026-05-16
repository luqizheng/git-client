import { ref, computed, type Ref } from 'vue'
import type { Commit } from '../../../types/git'
import { matchesFilter } from '../utils/commitHelpers'

export function useFilter(commits: Ref<Commit[]>) {
  const filterText = ref('')

  const filteredCommits = computed(() => {
    const q = filterText.value.trim()
    if (!q) return commits.value
    return commits.value.filter(c =>
      matchesFilter(c, q, 'all'),
    )
  })

  return {
    filterText,
    filteredCommits,
  }
}
