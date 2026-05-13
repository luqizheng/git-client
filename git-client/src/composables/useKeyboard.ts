import { onMounted, onUnmounted } from 'vue'

type ShortcutHandler = () => void

interface Shortcut {
  key: string
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  handler: ShortcutHandler
}

export function useKeyboard(shortcuts: Shortcut[]) {
  function onKeyDown(e: KeyboardEvent) {
    for (const s of shortcuts) {
      const ctrlMatch = s.ctrl ? (e.ctrlKey || e.metaKey) : !(e.ctrlKey || e.metaKey)
      const shiftMatch = s.shift ? e.shiftKey : !e.shiftKey
      const altMatch = s.alt ? e.altKey : !e.altKey
      if (ctrlMatch && shiftMatch && altMatch && e.key.toLowerCase() === s.key.toLowerCase()) {
        e.preventDefault()
        s.handler()
        return
      }
    }
  }

  onMounted(() => window.addEventListener('keydown', onKeyDown))
  onUnmounted(() => window.removeEventListener('keydown', onKeyDown))
}
