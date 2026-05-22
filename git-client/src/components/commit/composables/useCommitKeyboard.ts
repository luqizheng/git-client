import { ref, computed } from 'vue'
import { useKeyboard, type Shortcut } from '../../../composables/useKeyboard'
import type { Commit } from '../../../types/git'

export function useCommitKeyboard(commits: () => Commit[], options: {
  onSelect: (commit: Commit) => void
  onCopySha: (sha: string) => void
  onOpenDetail: (commit: Commit) => void
}) {
  const selectedIndex = ref(-1)
  const selectedIds = ref<Set<string>>(new Set())
  const isMultiSelectMode = ref(false)

  const selectedCommit = computed(() => {
    if (selectedIndex.value >= 0 && selectedIndex.value < commits().length) {
      return commits()[selectedIndex.value]
    }
    return null
  })

  function moveUp() {
    if (selectedIndex.value > 0) {
      selectedIndex.value--
      options.onSelect(commits()[selectedIndex.value])
    }
  }

  function moveDown() {
    if (selectedIndex.value < commits().length - 1) {
      selectedIndex.value++
      options.onSelect(commits()[selectedIndex.value])
    }
  }

  function toggleMultiSelect(id: string) {
    isMultiSelectMode.value = true
    if (selectedIds.value.has(id)) {
      selectedIds.value.delete(id)
    } else {
      selectedIds.value.add(id)
    }
    selectedIds.value = new Set(selectedIds.value)
  }

  function clearSelection() {
    selectedIds.value.clear()
    isMultiSelectMode.value = false
  }

  const shortcuts: Shortcut[] = [
    { key: 'ArrowUp', handler: moveUp },
    { key: 'ArrowDown', handler: moveDown },
    {
      key: 'Enter',
      handler: () => {
        if (selectedCommit.value) options.onOpenDetail(selectedCommit.value)
      }
    },
    {
      key: ' ',
      ctrl: false,
      shift: false,
      alt: false,
      handler: () => {
        if (selectedCommit.value) toggleMultiSelect(selectedCommit.value.id)
      }
    },
    {
      key: 'c',
      ctrl: true,
      handler: () => {
        if (selectedCommit.value) options.onCopySha(selectedCommit.value.id)
      }
    },
    {
      key: 'Escape',
      handler: clearSelection
    },
  ]

  useKeyboard(shortcuts)

  return {
    selectedIndex,
    selectedIds,
    isMultiSelectMode,
    selectedCommit,
    moveUp,
    moveDown,
    toggleMultiSelect,
    clearSelection,
  }
}
