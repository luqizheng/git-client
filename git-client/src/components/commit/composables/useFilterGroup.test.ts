import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useFilterGroup } from './useFilterGroup'
import type { Commit } from '../../../types/git'

const makeCommit = (overrides: Partial<Commit> = {}): Commit => ({
  id: 'abc123',
  message: 'test message',
  author: 'Test Author',
  author_email: 'test@test.com',
  time: 1000000,
  parent_ids: [],
  refs: [],
  ...overrides,
})

describe('useFilterGroup', () => {
  it('returns all commits when filter is empty', () => {
    const commits = ref([makeCommit(), makeCommit({ id: 'def456' })])
    const { filteredCommits } = useFilterGroup(commits)
    expect(filteredCommits.value).toHaveLength(2)
  })

  it('filters by message', () => {
    const commits = ref([
      makeCommit({ message: 'feat: login' }),
      makeCommit({ id: 'def456', message: 'fix: bug' }),
    ])
    const { filteredCommits, filterText, filterType } = useFilterGroup(commits)
    filterText.value = 'login'
    filterType.value = 'message'
    expect(filteredCommits.value).toHaveLength(1)
    expect(filteredCommits.value[0].message).toBe('feat: login')
  })

  it('filters by author', () => {
    const commits = ref([
      makeCommit({ author: 'Alice' }),
      makeCommit({ id: 'def456', author: 'Bob' }),
    ])
    const { filteredCommits, filterText, filterType } = useFilterGroup(commits)
    filterText.value = 'alice'
    filterType.value = 'author'
    expect(filteredCommits.value).toHaveLength(1)
  })

  it('filters by hash', () => {
    const commits = ref([
      makeCommit({ id: 'abc123def' }),
      makeCommit({ id: 'xyz789ghi' }),
    ])
    const { filteredCommits, filterText, filterType } = useFilterGroup(commits)
    filterText.value = 'abc'
    filterType.value = 'hash'
    expect(filteredCommits.value).toHaveLength(1)
  })

  it('filters by all fields', () => {
    const commits = ref([
      makeCommit({ message: 'login feature' }),
      makeCommit({ id: 'login123', author: 'Other', message: 'other' }),
    ])
    const { filteredCommits, filterText, filterType } = useFilterGroup(commits)
    filterText.value = 'login'
    filterType.value = 'all'
    expect(filteredCommits.value).toHaveLength(2)
  })

  it('returns empty when no match', () => {
    const commits = ref([makeCommit()])
    const { filteredCommits, filterText, filterType } = useFilterGroup(commits)
    filterText.value = 'nonexistent'
    filterType.value = 'message'
    expect(filteredCommits.value).toHaveLength(0)
  })
})
