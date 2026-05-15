import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useInteractions } from './useInteractions'
import type { Commit } from '../../../types/git'

const makeCommit = (id: string): Commit => ({
  id,
  message: 'test',
  author: 'Test',
  author_email: 't@t.com',
  time: 1000000,
  parent_ids: [],
  refs: [],
})

describe('useInteractions', () => {
  it('initializes with no selection', () => {
    const selectedId = ref<string | null>(null)
    const { selectedIds, hoveredId } = useInteractions(selectedId)
    expect(selectedIds.value.size).toBe(0)
    expect(hoveredId.value).toBeNull()
  })

  it('handles click - single select', () => {
    const selectedId = ref<string | null>(null)
    const { selectedIds, handleClick } = useInteractions(selectedId)
    const commit = makeCommit('abc')
    handleClick(commit, false, false)
    expect(selectedId.value).toBe('abc')
    expect(selectedIds.value.has('abc')).toBe(true)
  })

  it('handles ctrl+click - multi select', () => {
    const selectedId = ref<string | null>(null)
    const { selectedIds, handleClick } = useInteractions(selectedId)
    handleClick(makeCommit('abc'), false, false)
    handleClick(makeCommit('def'), true, false)
    expect(selectedIds.value.size).toBe(2)
    expect(selectedIds.value.has('abc')).toBe(true)
    expect(selectedIds.value.has('def')).toBe(true)
  })

  it('handles ctrl+click toggle off', () => {
    const selectedId = ref<string | null>(null)
    const { selectedIds, handleClick } = useInteractions(selectedId)
    handleClick(makeCommit('abc'), false, false)
    handleClick(makeCommit('abc'), true, false)
    expect(selectedIds.value.has('abc')).toBe(false)
  })

  it('handles shift+click - range select', () => {
    const selectedId = ref<string | null>(null)
    const commits = [makeCommit('a'), makeCommit('b'), makeCommit('c')]
    const { selectedIds, handleClick } = useInteractions(selectedId)
    handleClick(commits[0], false, false)
    handleClick(commits[2], false, true)
    expect(selectedIds.value.size).toBeGreaterThanOrEqual(2)
  })

  it('handles hover', () => {
    const selectedId = ref<string | null>(null)
    const { hoveredId, setHovered } = useInteractions(selectedId)
    setHovered('abc')
    expect(hoveredId.value).toBe('abc')
    setHovered(null)
    expect(hoveredId.value).toBeNull()
  })

  it('clears selection', () => {
    const selectedId = ref<string | null>(null)
    const { selectedIds, handleClick, clearSelection } = useInteractions(selectedId)
    handleClick(makeCommit('abc'), false, false)
    clearSelection()
    expect(selectedIds.value.size).toBe(0)
  })
})
