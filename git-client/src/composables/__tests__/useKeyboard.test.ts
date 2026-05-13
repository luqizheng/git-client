import { describe, it, expect } from 'vitest'
import { useKeyboard } from '../useKeyboard'

describe('useKeyboard', () => {
  it('accepts keyboard shortcut definitions', () => {
    const handler = () => {}
    useKeyboard([
      { key: 's', ctrl: true, handler },
      { key: 'l', ctrl: true, handler },
      { key: 'p', ctrl: true, shift: true, handler },
      { key: 'F5', handler },
    ])
  })
})
