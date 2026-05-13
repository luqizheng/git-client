import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useRepoStore } from '../repo'

describe('repo store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('initial state is empty', () => {
    const store = useRepoStore()
    expect(store.openRepos.size).toBe(0)
    expect(store.activeRepoPath).toBeNull()
    expect(store.recentRepos).toEqual([])
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('activeRepo returns null when no repo open', () => {
    const store = useRepoStore()
    expect(store.activeRepo).toBeNull()
  })

  it('repoName extracts last path segment', () => {
    const store = useRepoStore()
    expect(store.repoName('/home/user/my-project')).toBe('my-project')
    expect(store.repoName('C:\\Users\\dev\\repo')).toBe('repo')
  })

  it('switchTab does nothing if repo not in openRepos', () => {
    const store = useRepoStore()
    store.switchTab('/nonexistent')
    expect(store.activeRepoPath).toBeNull()
  })
})
