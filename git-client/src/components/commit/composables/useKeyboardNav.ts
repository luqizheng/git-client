import { ref, type Ref } from 'vue'

export function useKeyboardNav(totalItems: Ref<number>) {
  const focusedIndex = ref(0)
  const enterCallbacks: (() => void)[] = []
  const escapeCallbacks: (() => void)[] = []
  const searchCallbacks: (() => void)[] = []

  function handleKeyDown(e: KeyboardEvent): void {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        if (focusedIndex.value < totalItems.value - 1) {
          focusedIndex.value++
        }
        break
      case 'ArrowUp':
        e.preventDefault()
        if (focusedIndex.value > 0) {
          focusedIndex.value--
        }
        break
      case 'Enter':
        enterCallbacks.forEach(cb => cb())
        break
      case 'Escape':
        escapeCallbacks.forEach(cb => cb())
        break
      case '/':
        if (!e.ctrlKey && !e.metaKey) {
          e.preventDefault()
          searchCallbacks.forEach(cb => cb())
        }
        break
    }
  }

  function onEnter(cb: () => void): void {
    enterCallbacks.push(cb)
  }

  function onEscape(cb: () => void): void {
    escapeCallbacks.push(cb)
  }

  function onSearch(cb: () => void): void {
    searchCallbacks.push(cb)
  }

  function setFocusedIndex(idx: number): void {
    if (idx >= 0 && idx < totalItems.value) {
      focusedIndex.value = idx
    }
  }

  return {
    focusedIndex,
    handleKeyDown,
    onEnter,
    onEscape,
    onSearch,
    setFocusedIndex,
  }
}
