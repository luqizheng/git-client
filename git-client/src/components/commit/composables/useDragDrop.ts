import { reactive } from 'vue'
import type { Commit } from '../../../types/git'

export interface DragSource {
  branchName: string
  branchType: 'local' | 'remote'
}

export interface DragDropResult {
  source: DragSource
  targetCommit: Commit
}

export function useDragDrop() {
  const dragState = reactive({
    isDragging: false,
    source: null as DragSource | null,
    targetCommit: null as Commit | null,
  })

  function onDragStart(source: DragSource) {
    dragState.isDragging = true
    dragState.source = source
  }

  function onDragOver(commit: Commit) {
    if (dragState.isDragging) {
      dragState.targetCommit = commit
    }
  }

  function onDragLeave() {
    dragState.targetCommit = null
  }

  function onDrop(): DragDropResult | null {
    if (!dragState.isDragging || !dragState.source || !dragState.targetCommit) return null

    const result: DragDropResult = {
      source: dragState.source,
      targetCommit: dragState.targetCommit,
    }

    reset()
    return result
  }

  function reset() {
    dragState.isDragging = false
    dragState.source = null
    dragState.targetCommit = null
  }

  return { dragState, onDragStart, onDragOver, onDragLeave, onDrop, reset }
}
