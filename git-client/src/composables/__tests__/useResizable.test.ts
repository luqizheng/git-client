import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useResizable } from '../useResizable'

describe('useResizable', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('should call onResize with clamped value on mousemove', () => {
    const onResize = vi.fn()
    const container = document.createElement('div')
    document.body.appendChild(container)

    const { startDrag } = useResizable({
      container,
      direction: 'horizontal',
      minSize: 200,
      maxSize: 500,
      initialSize: 300,
      onResize,
    })

    startDrag(new MouseEvent('mousedown', { clientX: 300 }) as any)

    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 250 }))
    const delta = 250 - 300
    const expectedSize = Math.max(200, Math.min(500, 300 - delta))
    expect(onResize).toHaveBeenCalledWith(expectedSize)

    document.dispatchEvent(new MouseEvent('mouseup'))
    expect(onResize).toHaveBeenCalledTimes(1)
  })

  it('should clamp size below min', () => {
    const onResize = vi.fn()
    const container = document.createElement('div')
    document.body.appendChild(container)

    const { startDrag } = useResizable({
      container,
      direction: 'horizontal',
      minSize: 200,
      maxSize: 500,
      initialSize: 300,
      onResize,
    })

    startDrag(new MouseEvent('mousedown', { clientX: 300 }) as any)

    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 500 }))
    expect(onResize).toHaveBeenCalledWith(200)
  })

  it('should clamp size above max', () => {
    const onResize = vi.fn()
    const container = document.createElement('div')
    document.body.appendChild(container)

    const { startDrag } = useResizable({
      container,
      direction: 'horizontal',
      minSize: 200,
      maxSize: 500,
      initialSize: 300,
      onResize,
    })

    startDrag(new MouseEvent('mousedown', { clientX: 300 }) as any)

    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 100 }))
    expect(onResize).toHaveBeenCalledWith(500)
  })
})
