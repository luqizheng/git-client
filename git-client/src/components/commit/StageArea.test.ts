import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import StageArea from './StageArea.vue'
import { useStagingStore } from '../../stores/staging'
import { useRepoStore } from '../../stores/repo'
import type { FileStatus } from '../../types/git'

vi.mock('../../stores/staging', () => ({
  useStagingStore: vi.fn(() => ({
    getFileState: vi.fn(() => ({
      staged: [],
      unstaged: [],
    })),
    stageFiles: vi.fn(),
    unstageFiles: vi.fn(),
    refresh: vi.fn(),
  })),
}))

vi.mock('../../stores/repo', () => ({
  useRepoStore: vi.fn(() => ({
    activeRepoPath: '/test/repo',
  })),
}))

vi.mock('../../utils/diff', () => ({
  statusIcon: vi.fn((status: string) => {
    const icons: Record<string, string> = {
      'new file': 'N',
      modified: 'M',
      deleted: 'D',
      renamed: 'R',
    }
    return icons[status] || '?'
  }),
}))

describe('StageArea', () => {
  const makeFileStatus = (overrides: Partial<FileStatus> = {}): FileStatus => ({
    path: 'test/file.txt',
    status: 'modified',
    ...overrides,
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('displays staged files', () => {
    const mockStaging = {
      getFileState: vi.fn(() => ({
        staged: [makeFileStatus({ path: 'src/file1.ts' })],
        unstaged: [],
      })),
      stageFiles: vi.fn(),
      unstageFiles: vi.fn(),
      refresh: vi.fn(),
    }
    ;(useStagingStore as vi.Mock).mockReturnValue(mockStaging)

    const wrapper = mount(StageArea)
    expect(wrapper.text()).toContain('Staged Changes (1)')
    expect(wrapper.text()).toContain('src/file1.ts')
  })

  it('displays unstaged files', () => {
    const mockStaging = {
      getFileState: vi.fn(() => ({
        staged: [],
        unstaged: [makeFileStatus({ path: 'src/file2.ts', status: 'new file' })],
      })),
      stageFiles: vi.fn(),
      unstageFiles: vi.fn(),
      refresh: vi.fn(),
    }
    ;(useStagingStore as vi.Mock).mockReturnValue(mockStaging)

    const wrapper = mount(StageArea)
    expect(wrapper.text()).toContain('Changes (1)')
    expect(wrapper.text()).toContain('src/file2.ts')
  })

  it('calls stageFiles when clicking + button', async () => {
    const mockStaging = {
      getFileState: vi.fn(() => ({
        staged: [],
        unstaged: [makeFileStatus({ path: 'src/file.ts' })],
      })),
      stageFiles: vi.fn(),
      unstageFiles: vi.fn(),
      refresh: vi.fn(),
    }
    ;(useStagingStore as vi.Mock).mockReturnValue(mockStaging)

    const wrapper = mount(StageArea)
    const buttons = wrapper.findAll('button')
    const plusButton = buttons[0]
    await plusButton.trigger('click')

    expect(mockStaging.stageFiles).toHaveBeenCalledWith('/test/repo', ['src/file.ts'])
  })

  it('calls unstageFiles when clicking - button', async () => {
    const mockStaging = {
      getFileState: vi.fn(() => ({
        staged: [makeFileStatus({ path: 'src/file.ts' })],
        unstaged: [],
      })),
      stageFiles: vi.fn(),
      unstageFiles: vi.fn(),
      refresh: vi.fn(),
    }
    ;(useStagingStore as vi.Mock).mockReturnValue(mockStaging)

    const wrapper = mount(StageArea)
    const minusButton = wrapper.find('button')
    await minusButton.trigger('click')

    expect(mockStaging.unstageFiles).toHaveBeenCalledWith('/test/repo', ['src/file.ts'])
  })

  it('shows empty message when no files', () => {
    const mockStaging = {
      getFileState: vi.fn(() => ({
        staged: [],
        unstaged: [],
      })),
      stageFiles: vi.fn(),
      unstageFiles: vi.fn(),
      refresh: vi.fn(),
    }
    ;(useStagingStore as vi.Mock).mockReturnValue(mockStaging)

    const wrapper = mount(StageArea)
    expect(wrapper.text()).toContain('Staged Changes (0)')
    expect(wrapper.text()).toContain('Changes (0)')
  })
})
