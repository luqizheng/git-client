<template>
  <div
    class="commit-row"
    :class="{ selected, 'drag-over': isDragOver }"
    :style="{ transform: `translateY(${offset ?? 0}px)` }"
    @click="$emit('click')"
    @contextmenu="$emit('contextmenu', $event)"
    @dragover.prevent="$emit('dragover')"
    @dragleave="$emit('dragleave')"
  >
    <span class="text-xs text-gray-500 p-3">Commit placeholder</span>
  </div>
</template>

<script setup lang="ts">
import type { Commit } from '../../../types/git'
import type { ColumnConfig } from '../composables/useResizableColumns'

defineProps<{
  commit: Commit
  columns: ColumnConfig[]
  selected: boolean
  isDragOver: boolean
  offset?: number
}>()

defineEmits<{
  click: []
  contextmenu: [event: MouseEvent]
  dragover: []
  dragleave: []
}>()
</script>

<style scoped>
.commit-row {
  height: 40px;
  display: flex;
  align-items: center;
  position: absolute;
  left: 0;
  right: 0;
  cursor: pointer;
  border-bottom: 1px solid transparent;
  transition: background-color 0.15s ease;
}

.commit-row:hover {
  background: var(--row-hover, rgba(255, 255, 255, 0.05));
}

.commit-row.selected {
  background: var(--row-selected, rgba(59, 130, 246, 0.3));
}

.commit-row.drag-over {
  outline: 2px solid var(--drag-over-border, #3b82f6);
  outline-offset: -2px;
}
</style>
