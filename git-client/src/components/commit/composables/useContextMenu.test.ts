import { describe, it, expect } from 'vitest'
import { useContextMenu } from './useContextMenu'
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

describe('useContextMenu', () => {
  it('starts hidden', () => {
    const { state } = useContextMenu()
    expect(state.value.visible).toBe(false)
    expect(state.value.commit).toBeNull()
  })

  it('shows menu on open', () => {
    const { state, open } = useContextMenu()
    const commit = makeCommit('abc')
    open(100, 200, commit)
    expect(state.value.visible).toBe(true)
    expect(state.value.x).toBe(100)
    expect(state.value.y).toBe(200)
    expect(state.value.commit?.id).toBe('abc')
  })

  it('hides menu on close', () => {
    const { state, open, close } = useContextMenu()
    open(100, 200, makeCommit('abc'))
    close()
    expect(state.value.visible).toBe(false)
    expect(state.value.commit).toBeNull()
  })
})
