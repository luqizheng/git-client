import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCommitsStore } from '../commits'
import { useRepoStore } from '../repo'
import type { OpenRepo } from '../../types/git'

describe('commits store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('clearCommits resets repo state', () => {
    const repoStore = useRepoStore()
    const store = useCommitsStore()
    const testPath = '/test/repo'
    repoStore.openRepos.set(testPath, {
      state: { path: testPath, head_branch: 'main', head_commit_id: 'abc', is_bare: false, is_empty: false },
      commits: [{ id: 'abc', message: 't', author: 'a', author_email: 'e', time: 0, committer_time: 0, parent_ids: [], refs: [] }],
      branches: [],
      selectedCommit: { id: 'abc', message: 't', author: 'a', author_email: 'e', time: 0, committer_time: 0, parent_ids: [], refs: [] },
      hasMore: false,
      loading: false,
    } as OpenRepo)
    store.clearCommits(testPath)
    const openRepo = repoStore.openRepos.get(testPath)
    expect(openRepo?.commits).toEqual([])
    expect(openRepo?.selectedCommit).toBeNull()
    expect(openRepo?.hasMore).toBe(true)
  })

  it('clearCommits does nothing if repo not found', () => {
    const store = useCommitsStore()
    expect(() => store.clearCommits('/nonexistent')).not.toThrow()
  })
})
