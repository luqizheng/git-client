import { ref } from 'vue'
import type { Commit } from '../../../types/git'

export interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  commit: Commit | null
}

export function useContextMenu() {
  const state = ref<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    commit: null,
  })

  function open(x: number, y: number, commit: Commit): void {
    state.value = { visible: true, x, y, commit }
  }

  function close(): void {
    state.value = { visible: false, x: 0, y: 0, commit: null }
  }

  return {
    state,
    open,
    close,
  }
}
