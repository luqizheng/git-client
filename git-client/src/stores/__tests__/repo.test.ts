import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useRepoStore } from '../repo'

describe('repo store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('initial state is empty', () => {
    const store = useRepoStore()
    expect(store.currentRepo).toBeNull()
    expect(store.repoPath).toBe('')
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })
})
