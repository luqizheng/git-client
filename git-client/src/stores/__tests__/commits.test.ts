import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCommitsStore } from '../commits'

describe('commits store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('initial state is empty', () => {
    const store = useCommitsStore()
    expect(store.commits).toEqual([])
    expect(store.selectedCommit).toBeNull()
    expect(store.loading).toBe(false)
    expect(store.hasMore).toBe(true)
  })

  it('selectCommit updates selectedCommit', () => {
    const store = useCommitsStore()
    const commit = {
      id: 'abc123',
      message: 'test',
      author: 'user',
      author_email: 'u@e.com',
      time: 0,
      parent_ids: [],
    }
    store.selectCommit(commit)
    expect(store.selectedCommit).toEqual(commit)
  })

  it('clearCommits resets state', () => {
    const store = useCommitsStore()
    store.selectCommit({
      id: 'abc',
      message: 't',
      author: 'a',
      author_email: 'e',
      time: 0,
      parent_ids: [],
    })
    store.clearCommits()
    expect(store.commits).toEqual([])
    expect(store.selectedCommit).toBeNull()
  })
})
