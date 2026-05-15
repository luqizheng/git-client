import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useKeyboardNav } from './useKeyboardNav'

describe('useKeyboardNav', () => {
  it('initializes at index 0', () => {
    const { focusedIndex } = useKeyboardNav(ref(10))
    expect(focusedIndex.value).toBe(0)
  })

  it('moves down on ArrowDown', () => {
    const total = ref(10)
    const { focusedIndex, handleKeyDown } = useKeyboardNav(total)
    handleKeyDown(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
    expect(focusedIndex.value).toBe(1)
  })

  it('moves up on ArrowUp', () => {
    const total = ref(10)
    const { focusedIndex, handleKeyDown } = useKeyboardNav(total)
    focusedIndex.value = 2
    handleKeyDown(new KeyboardEvent('keydown', { key: 'ArrowUp' }))
    expect(focusedIndex.value).toBe(1)
  })

  it('does not go below 0', () => {
    const total = ref(10)
    const { focusedIndex, handleKeyDown } = useKeyboardNav(total)
    handleKeyDown(new KeyboardEvent('keydown', { key: 'ArrowUp' }))
    expect(focusedIndex.value).toBe(0)
  })

  it('does not exceed total - 1', () => {
    const total = ref(3)
    const { focusedIndex, handleKeyDown } = useKeyboardNav(total)
    for (let i = 0; i < 5; i++) {
      handleKeyDown(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
    }
    expect(focusedIndex.value).toBe(2)
  })

  it('detects Enter key', () => {
    const total = ref(10)
    const { handleKeyDown, onEnter } = useKeyboardNav(total)
    let called = false
    onEnter(() => { called = true })
    handleKeyDown(new KeyboardEvent('keydown', { key: 'Enter' }))
    expect(called).toBe(true)
  })

  it('detects Escape key', () => {
    const total = ref(10)
    const { handleKeyDown, onEscape } = useKeyboardNav(total)
    let called = false
    onEscape(() => { called = true })
    handleKeyDown(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(called).toBe(true)
  })
})
