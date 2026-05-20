import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useColumnConfig } from './useColumnConfig'

vi.mock('../../../stores/repo', () => ({
  useRepoStore: () => ({
    activeRepoPath: '/test/repo',
  }),
}))

describe('useColumnConfig', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('should return default columns', () => {
    const { columns } = useColumnConfig()
    expect(columns.value).toHaveLength(5)
    expect(columns.value.find(c => c.id === 'graphy')?.label).toBe('Graph')
    expect(columns.value.find(c => c.id === 'message')?.hideable).toBe(false)
  })

  it('should persist column width to localStorage', () => {
    const { setColumnWidth } = useColumnConfig()
    setColumnWidth('author', 150)
    const stored = localStorage.getItem('commit-list-columns')
    expect(stored).toBeTruthy()
  })

  it('should not allow width below minWidth', () => {
    const { columns, setColumnWidth } = useColumnConfig()
    const originalWidth = columns.value.find(c => c.id === 'author')!.width
    setColumnWidth('author', 10)
    expect(columns.value.find(c => c.id === 'author')!.width).toBe(originalWidth)
  })
})
