import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ChangedFilesList from './ChangedFilesList.vue'
import type { FileDiff, DiffStatus } from '../../types/git'

const makeFileDiff = (overrides: Partial<FileDiff> = {}): FileDiff => ({
  path: 'test/file.txt',
  status: 'Modified' as DiffStatus,
  old_path: undefined,
  hunks: [],
  ...overrides,
})

describe('ChangedFilesList', () => {
  it('displays file count in header', () => {
    const files = [makeFileDiff(), makeFileDiff({ path: 'test/file2.txt' })]
    const wrapper = mount(ChangedFilesList, {
      props: { files, selectedFile: null },
    })
    expect(wrapper.find('.changed-files-header').text()).toBe('Changed Files (2)')
  })

  it('displays file items', () => {
    const files = [makeFileDiff({ path: 'src/index.ts', status: 'Added' })]
    const wrapper = mount(ChangedFilesList, {
      props: { files, selectedFile: null },
    })
    expect(wrapper.find('.file-path').text()).toBe('src/index.ts')
    expect(wrapper.find('.file-status').text()).toBe('A')
  })

  it('shows empty state when no files', () => {
    const wrapper = mount(ChangedFilesList, {
      props: { files: [], selectedFile: null },
    })
    expect(wrapper.find('.no-files').exists()).toBe(true)
    expect(wrapper.find('.no-files').text()).toBe('No changed files')
  })

  it('highlights selected file', () => {
    const files = [
      makeFileDiff({ path: 'src/file1.ts' }),
      makeFileDiff({ path: 'src/file2.ts' }),
    ]
    const wrapper = mount(ChangedFilesList, {
      props: { files, selectedFile: 'src/file2.ts' },
    })
    const fileItems = wrapper.findAll('.file-item')
    expect(fileItems[0].classes()).not.toContain('selected')
    expect(fileItems[1].classes()).toContain('selected')
  })

  it('emits select event on click', async () => {
    const files = [makeFileDiff({ path: 'src/file.ts' })]
    const wrapper = mount(ChangedFilesList, {
      props: { files, selectedFile: null },
    })
    await wrapper.find('.file-item').trigger('click')
    expect(wrapper.emitted('select')).toBeTruthy()
    expect(wrapper.emitted('select')?.[0]).toEqual(['src/file.ts'])
  })

  it('returns correct status label', () => {
    const files = [
      makeFileDiff({ status: 'Added' }),
      makeFileDiff({ status: 'Modified' }),
      makeFileDiff({ status: 'Deleted' }),
      makeFileDiff({ status: 'Renamed' }),
    ]
    const wrapper = mount(ChangedFilesList, {
      props: { files, selectedFile: null },
    })
    const statuses = wrapper.findAll('.file-status')
    expect(statuses[0].text()).toBe('A')
    expect(statuses[1].text()).toBe('M')
    expect(statuses[2].text()).toBe('D')
    expect(statuses[3].text()).toBe('R')
  })
})