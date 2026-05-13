import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useRightPanelStore } from '../rightPanel'

describe('rightPanel store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('should have correct initial state', () => {
    const store = useRightPanelStore()
    expect(store.visible).toBe(false)
    expect(store.width).toBe(320)
    expect(store.mode).toBeNull()
    expect(store.selectedCommitSha).toBeNull()
    expect(store.commitDetail).toBeNull()
    expect(store.changedFiles).toEqual([])
    expect(store.unstagedFiles).toEqual([])
    expect(store.stagedFiles).toEqual([])
    expect(store.commitMessage.summary).toBe('')
    expect(store.commitMessage.description).toBe('')
    expect(store.amendMode).toBe(false)
  })

  it('showPanel should set visible and mode', () => {
    const store = useRightPanelStore()
    store.showPanel('commit', 'abc1234')
    expect(store.visible).toBe(true)
    expect(store.mode).toBe('commit')
    expect(store.selectedCommitSha).toBe('abc1234')
  })

  it('showPanel staging mode should not set sha', () => {
    const store = useRightPanelStore()
    store.showPanel('staging')
    expect(store.visible).toBe(true)
    expect(store.mode).toBe('staging')
    expect(store.selectedCommitSha).toBeNull()
  })

  it('hidePanel should reset state', () => {
    const store = useRightPanelStore()
    store.showPanel('commit', 'abc1234')
    store.hidePanel()
    expect(store.visible).toBe(false)
    expect(store.mode).toBeNull()
    expect(store.selectedCommitSha).toBeNull()
  })

  it('togglePanel should toggle visibility', () => {
    const store = useRightPanelStore()
    expect(store.visible).toBe(false)
    store.togglePanel()
    expect(store.visible).toBe(true)
    store.togglePanel()
    expect(store.visible).toBe(false)
  })

  it('setWidth should clamp between min and max', () => {
    const store = useRightPanelStore()
    store.setWidth(100)
    expect(store.width).toBe(240)
    store.setWidth(999)
    expect(store.width).toBe(480)
    store.setWidth(300)
    expect(store.width).toBe(300)
  })
})
