import { ref, type Ref } from 'vue'
import type { Commit } from '../../../types/git'

export function useInteractions(selectedId: Ref<string | null>) {
  const hoveredId = ref<string | null>(null)
  const selectedIds = ref<Set<string>>(new Set())
  const lastSelectedId = ref<string | null>(null)

  function handleClick(commit: Commit, ctrlKey: boolean, shiftKey: boolean): void {
    if (ctrlKey) {
      if (selectedIds.value.has(commit.id)) {
        selectedIds.value.delete(commit.id)
        selectedIds.value = new Set(selectedIds.value)
      } else {
        selectedIds.value = new Set([...selectedIds.value, commit.id])
      }
      if (selectedIds.value.size === 1) {
        selectedId.value = commit.id
      } else if (selectedIds.value.size === 0) {
        selectedId.value = null
      }
    } else if (shiftKey && lastSelectedId.value) {
      selectedIds.value = new Set([lastSelectedId.value, commit.id])
      selectedId.value = commit.id
    } else {
      selectedIds.value = new Set([commit.id])
      selectedId.value = commit.id
    }
    lastSelectedId.value = commit.id
  }

  function setHovered(id: string | null): void {
    hoveredId.value = id
  }

  function clearSelection(): void {
    selectedIds.value = new Set()
    selectedId.value = null
    lastSelectedId.value = null
  }

  return {
    hoveredId,
    selectedIds,
    handleClick,
    setHovered,
    clearSelection,
  }
}
