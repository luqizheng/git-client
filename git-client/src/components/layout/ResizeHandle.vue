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
import { ref } from 'vue'
import { useResizable } from '../../composables/useResizable'

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

function getContainer(): HTMLElement {
  return props.container ?? (document.querySelector('.main-container') as HTMLElement) ?? document.body
}

function onMouseDown(e: MouseEvent) {
  const { startDrag } = useResizable({
    container: getContainer(),
    direction: props.direction,
    minSize: props.minSize,
    maxSize: props.maxSize,
    initialSize: props.getSize?.() ?? 320,
    onResize: (size) => {
      dragging.value = true
      emit('resize', size)
    },
  })
  startDrag(e)
  setTimeout(() => { dragging.value = false }, 100)
}
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
