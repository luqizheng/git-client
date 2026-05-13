import { onUnmounted } from 'vue'

interface UseResizableOptions {
  container: HTMLElement
  direction: 'horizontal' | 'vertical'
  minSize: number
  maxSize: number
  initialSize: number
  onResize: (size: number) => void
}

export function useResizable(options: UseResizableOptions) {
  let startX = 0
  let startSize = 0
  let isDragging = false

  function startDrag(e: MouseEvent) {
    e.preventDefault()
    isDragging = true
    startX = options.direction === 'horizontal' ? e.clientX : e.clientY
    startSize = options.initialSize
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    document.body.style.cursor = options.direction === 'horizontal' ? 'col-resize' : 'row-resize'
    document.body.style.userSelect = 'none'
  }

  function onMouseMove(e: MouseEvent) {
    if (!isDragging) return
    const current = options.direction === 'horizontal' ? e.clientX : e.clientY
    const delta = current - startX
    const newSize = options.direction === 'horizontal'
      ? startSize - delta
      : startSize + delta
    const clamped = Math.max(options.minSize, Math.min(options.maxSize, newSize))
    options.onResize(clamped)
  }

  function onMouseUp() {
    isDragging = false
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }

  onUnmounted(() => {
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  })

  return { startDrag, isDragging: () => isDragging }
}
