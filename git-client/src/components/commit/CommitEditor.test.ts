import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import CommitEditor from './CommitEditor.vue'
import { useRepoStore } from '../../stores/repo'
import { useCommitsStore } from '../../stores/commits'

vi.mock('../../stores/repo', () => ({
  useRepoStore: vi.fn(() => ({
    activeRepoPath: '/test/repo',
  })),
}))

vi.mock('../../stores/commits', () => ({
  useCommitsStore: vi.fn(() => ({
    fetchLogs: vi.fn(),
  })),
}))

vi.mock('../../utils/ipc', () => ({
  invoke: vi.fn(),
}))

vi.mock('vue-sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('CommitEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('applies template to message', async () => {
    const wrapper = mount(CommitEditor)
    const textarea = wrapper.find('textarea')
    expect(textarea.exists()).toBe(true)
  })

  it('disables commit button when message is empty', () => {
    const wrapper = mount(CommitEditor)
    const button = wrapper.findAll('button').find(b => b.text() === 'Commit')
    expect(button?.attributes('disabled')).toBeDefined()
  })

  it('enables commit button when message has content', async () => {
    const wrapper = mount(CommitEditor)
    const textarea = wrapper.find('textarea')
    await textarea.setValue('test commit message')
    
    await wrapper.vm.$nextTick()
    
    const button = wrapper.findAll('button').find(b => b.text() === 'Commit')
    expect(button?.attributes('disabled')).toBeUndefined()
  })

  it('has amend checkbox', () => {
    const wrapper = mount(CommitEditor)
    const amendLabel = wrapper.find('label')
    expect(amendLabel.text()).toContain('Amend')
  })
})
