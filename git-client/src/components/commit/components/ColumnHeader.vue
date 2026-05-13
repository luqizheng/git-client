<template>
  <div class="column-header">
    <div
      v-for="col in visibleColumns"
      :key="col.key"
      class="column-header-cell"
      :class="{ 'fixed-left': col.fixed === 'left', 'fixed-right': col.fixed === 'right' }"
      :style="{ width: col.width + 'px', minWidth: col.width + 'px', maxWidth: col.width + 'px' }"
    >
      <span class="column-label">{{ col.label }}</span>
      <div
        class="resize-handle"
        @mousedown.stop.prevent="startResize($event, col.key)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ColumnConfig } from '../composables/useResizableColumns'

const props = defineProps<{
  columns: ColumnConfig[]
}>()

const emit = defineEmits<{
  resize: [columnKey: string, delta: number]
}>()

const visibleColumns = computed(() => props.columns.filter(c => c.visible))

let resizingKey: string | null = null
let startX = 0

function startResize(e: MouseEvent, key: string) {
  resizingKey = key
  startX = e.clientX

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

function onMouseMove(e: MouseEvent) {
  if (!resizingKey) return
  const delta = e.clientX - startX
  emit('resize', resizingKey, delta)
  startX = e.clientX
}

function onMouseUp() {
  resizingKey = null
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
}
</script>

<style scoped>
.column-header {
  display: flex;
  height: 32px;
  background: var(--bg-secondary, #252526);
  border-bottom: 1px solid var(--border-color, #3c3c3c);
  user-select: none;
}

.column-header-cell {
  padding: 0 8px;
  display: flex;
  align-items: center;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary, #969696);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  position: relative;
  flex-shrink: 0;
  background: var(--bg-secondary, #252526);
}

.column-header-cell.fixed-left {
  position: sticky;
  left: 0;
  z-index: 3;
}

.column-header-cell.fixed-right {
  position: sticky;
  right: 0;
  z-index: 3;
}

.column-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.resize-handle {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  cursor: col-resize;
  opacity: 0;
  transition: opacity 0.15s;
}

.column-header-cell:hover .resize-handle {
  opacity: 1;
  background: var(--accent-color, #0078d4);
}
</style>
