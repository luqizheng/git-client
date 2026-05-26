import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useFilter } from './useFilter'
import type { Commit } from '../../../types/git'

const makeCommit = (overrides: Partial<Commit> = {}): Commit => ({
  id: 'abc123',
  message: 'test message',
  author: 'Test Author',
  author_email: 'test@test.com',
  time: 1000000,
  committer_time: 1000000,
  parent_ids: [],
  refs: [],
  ...overrides,
})

describe('useFilter', () => {
  it('returns all commits when filter is empty', () => {
    const commits = ref([makeCommit(), makeCommit({ id: 'def456' })])
    const { filteredCommits } = useFilter(commits)
    expect(filteredCommits.value).toHaveLength(2)
  })

  it('filters by message (case-insensitive)', () => {
    const commits = ref([
      makeCommit({ message: 'feat: login' }),
      makeCommit({ id: 'def456', message: 'fix: bug' }),
    ])
    const { filteredCommits, filterText } = useFilter(commits)
    filterText.value = 'login'
    expect(filteredCommits.value).toHaveLength(1)
    expect(filteredCommits.value[0].message).toBe('feat: login')
  })

  it('filters by author', () => {
    const commits = ref([
      makeCommit({ author: 'Alice' }),
      makeCommit({ id: 'def456', author: 'Bob' }),
    ])
    const { filteredCommits, filterText } = useFilter(commits)
    filterText.value = 'alice'
    expect(filteredCommits.value).toHaveLength(1)
  })

  it('filters by author_email', () => {
    const commits = ref([
      makeCommit({ author_email: 'alice@a.com' }),
      makeCommit({ id: 'def456', author_email: 'bob@b.com' }),
    ])
    const { filteredCommits, filterText } = useFilter(commits)
    filterText.value = 'alice@'
    expect(filteredCommits.value).toHaveLength(1)
  })

  it('filters by hash prefix', () => {
    const commits = ref([
      makeCommit({ id: 'abc123def' }),
      makeCommit({ id: 'xyz789ghi' }),
    ])
    const { filteredCommits, filterText } = useFilter(commits)
    filterText.value = 'abc'
    expect(filteredCommits.value).toHaveLength(1)
  })

  it('returns empty when no match', () => {
    const commits = ref([makeCommit()])
    const { filteredCommits, filterText } = useFilter(commits)
    filterText.value = 'nonexistent'
    expect(filteredCommits.value).toHaveLength(0)
  })

  it('trims whitespace from filter text', () => {
    const commits = ref([makeCommit({ message: 'hello' })])
    const { filteredCommits, filterText } = useFilter(commits)
    filterText.value = '  hello  '
    expect(filteredCommits.value).toHaveLength(1)
  })
})
