import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
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

describe('CommitEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('applies template to message', async () => {
    const wrapper = mount(CommitEditor)
    const select = wrapper.find('[role="combobox"]')
    await select.trigger('click')
    
    const featOption = wrapper.find('[data-value="feat: "]')
    await featOption.trigger('click')
    
    const textarea = wrapper.find('textarea')
    expect(textarea.element.value).toBe('feat: ')
  })

  it('does not duplicate template prefix', async () => {
    const wrapper = mount(CommitEditor)
    
    const textarea = wrapper.find('textarea')
    await textarea.setValue('feat: existing message')
    
    const select = wrapper.find('[role="combobox"]')
    await select.trigger('click')
    
    const featOption = wrapper.find('[data-value="feat: "]')
    await featOption.trigger('click')
    
    expect(textarea.element.value).toBe('feat: existing message')
  })

  it('replaces existing prefix with new template', async () => {
    const wrapper = mount(CommitEditor)
    
    const textarea = wrapper.find('textarea')
    await textarea.setValue('fix: existing message')
    
    const select = wrapper.find('[role="combobox"]')
    await select.trigger('click')
    
    const featOption = wrapper.find('[data-value="feat: "]')
    await featOption.trigger('click')
    
    expect(textarea.element.value).toBe('feat: existing message')
  })

  it('disables commit button when message is empty', () => {
    const wrapper = mount(CommitEditor)
    const button = wrapper.find('button')
    expect(button.attributes('disabled')).toBeDefined()
  })

  it('enables commit button when message has content', async () => {
    const wrapper = mount(CommitEditor)
    const textarea = wrapper.find('textarea')
    await textarea.setValue('test commit message')
    
    const button = wrapper.find('button')
    expect(button.attributes('disabled')).toBeUndefined()
  })

  it('toggles amend checkbox', async () => {
    const wrapper = mount(CommitEditor)
    const checkbox = wrapper.find('input[type="checkbox"]')
    
    expect(checkbox.element.checked).toBe(false)
    await checkbox.trigger('click')
    expect(checkbox.element.checked).toBe(true)
  })
})