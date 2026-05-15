import { describe, it, expect } from 'vitest'
import {
  formatRelativeTime,
  getFirstLine,
  matchesFilter,
  truncateText,
  formatCommitInfo,
} from './commitHelpers'
import type { Commit } from '../../../types/git'

describe('formatRelativeTime', () => {
  it('returns "just now" for < 60s', () => {
    const now = Math.floor(Date.now() / 1000)
    expect(formatRelativeTime(now)).toBe('just now')
  })

  it('returns minutes for < 1h', () => {
    const now = Math.floor(Date.now() / 1000) - 120
    expect(formatRelativeTime(now)).toBe('2m ago')
  })

  it('returns hours for < 1d', () => {
    const now = Math.floor(Date.now() / 1000) - 7200
    expect(formatRelativeTime(now)).toBe('2h ago')
  })

  it('returns days for < 30d', () => {
    const now = Math.floor(Date.now() / 1000) - 172800
    expect(formatRelativeTime(now)).toBe('2d ago')
  })

  it('returns date string for older', () => {
    const ts = Math.floor(new Date('2024-01-15').getTime() / 1000)
    const result = formatRelativeTime(ts)
    expect(result).toContain('/')
  })
})

describe('getFirstLine', () => {
  it('returns first line of message', () => {
    expect(getFirstLine('feat: add feature\n\nBody text')).toBe('feat: add feature')
  })

  it('returns whole message if no newline', () => {
    expect(getFirstLine('single line')).toBe('single line')
  })
})

describe('matchesFilter', () => {
  const commit: Commit = {
    id: 'abc123def456',
    message: 'feat: add login page',
    author: 'John Doe',
    author_email: 'john@example.com',
    time: 1000000,
    parent_ids: [],
    refs: [],
  }

  it('matches message filter', () => {
    expect(matchesFilter(commit, 'login', 'message')).toBe(true)
    expect(matchesFilter(commit, 'LOGIN', 'message')).toBe(true)
    expect(matchesFilter(commit, 'xyz', 'message')).toBe(false)
  })

  it('matches author filter', () => {
    expect(matchesFilter(commit, 'john', 'author')).toBe(true)
    expect(matchesFilter(commit, 'john@example', 'author')).toBe(true)
    expect(matchesFilter(commit, 'jane', 'author')).toBe(false)
  })

  it('matches hash filter', () => {
    expect(matchesFilter(commit, 'abc123', 'hash')).toBe(true)
    expect(matchesFilter(commit, 'xyz', 'hash')).toBe(false)
  })

  it('matches all filter', () => {
    expect(matchesFilter(commit, 'abc', 'all')).toBe(true)
    expect(matchesFilter(commit, 'login', 'all')).toBe(true)
    expect(matchesFilter(commit, 'john', 'all')).toBe(true)
    expect(matchesFilter(commit, 'zzz', 'all')).toBe(false)
  })
})

describe('truncateText', () => {
  it('returns original if short enough', () => {
    expect(truncateText('hello', 10)).toBe('hello')
  })

  it('truncates with ellipsis', () => {
    expect(truncateText('hello world', 8)).toBe('hello w\u2026')
  })
})

describe('formatCommitInfo', () => {
  it('formats commit info string', () => {
    const commit: Commit = {
      id: 'abc123def456',
      message: 'feat: add feature',
      author: 'John',
      author_email: 'j@e.com',
      time: 1000000,
      parent_ids: [],
      refs: [],
    }
    const result = formatCommitInfo(commit)
    expect(result).toContain('abc123d')
    expect(result).toContain('feat: add feature')
    expect(result).toContain('John')
  })
})
