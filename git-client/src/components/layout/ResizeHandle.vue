<template>
  <div
    class="resize-handle"
    :class="{ active: dragging }"
    @mousedown.stop="onMouseDown"
  >
    <div class="handle-line" />
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'

const props = withDefaults(defineProps<{
  direction?: 'horizontal' | 'vertical'
  container?: HTMLElement
  minSize?: number
  maxSize?: number
  getSize?: () => number
}>(), {
  direction: 'horizontal',
  minSize: 100,
  maxSize: 800,
})

const emit = defineEmits<{
  resize: [size: number]
}>()

const dragging = ref(false)
let isDragging = false
let startX = 0
let startY = 0
let startSize = 0

function getContainer(): HTMLElement {
  return props.container ?? (document.querySelector('.main-container') as HTMLElement) ?? document.body
}

function onMouseDown(e: MouseEvent) {
  e.preventDefault()
  isDragging = true
  dragging.value = true
  startX = e.clientX
  startY = e.clientY
  startSize = props.getSize?.() ?? 320

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
  document.body.style.cursor = props.direction === 'horizontal' ? 'col-resize' : 'row-resize'
  document.body.style.userSelect = 'none'
}

function onMouseMove(e: MouseEvent) {
  if (!isDragging) return

  const current = props.direction === 'horizontal' ? e.clientX : e.clientY
  const start = props.direction === 'horizontal' ? startX : startY
  const delta = current - start
  const newSize = props.direction === 'horizontal'
    ? startSize - delta
    : startSize + delta
  const clamped = Math.max(props.minSize, Math.min(props.maxSize, newSize))
  emit('resize', clamped)
}

function onMouseUp() {
  isDragging = false
  dragging.value = false
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

onUnmounted(() => {
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
})
</script>

<style scoped>
.resize-handle {
  width: 4px;
  background: transparent;
  transition: background 0.15s;
  position: relative;
  z-index: 10;
  flex-shrink: 0;
}
.resize-handle:hover,
.resize-handle.active {
  background: #0e639c;
}
.handle-line {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 1px;
  background: var(--border-color, #3c3c3c);
}
.resize-handle:hover .handle-line,
.resize-handle.active .handle-line {
  background: transparent;
}
</style>
