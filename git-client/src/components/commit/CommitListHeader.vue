<script setup lang="ts">
import { ref } from 'vue'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useColumnConfig } from './composables/useColumnConfig'

const { visibleColumns, columnStyles, toggleColumnVisibility, resetToDefault, columns, setColumnWidth } = useColumnConfig()

const resizing = ref<string | null>(null)
const startX = ref(0)
const startWidth = ref(0)

function startResize(e: MouseEvent, columnId: string, currentWidth: number) {
  e.preventDefault()
  e.stopPropagation()
  resizing.value = columnId
  startX.value = e.clientX
  startWidth.value = currentWidth
  document.addEventListener('mousemove', onResize)
  document.addEventListener('mouseup', stopResize)
}

function onResize(e: MouseEvent) {
  if (!resizing.value) return
  const delta = e.clientX - startX.value
  const newWidth = startWidth.value + delta
  setColumnWidth(resizing.value, newWidth)
}

function stopResize() {
  resizing.value = null
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
}
</script>

<template>
  <div class="commit-list-header">
    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <div class="header-trigger">Columns</div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuCheckboxItem
          v-for="col in columns"
          :key="col.id"
          :checked="col.visible"
          :disabled="!col.hideable"
          @update:checked="toggleColumnVisibility(col.id)"
          @click.stop
        >
          {{ col.label }}
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem @click="resetToDefault">
          Reset to Default
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    <div class="header-graph-placeholder">Graph</div>

    <div class="header-columns">
      <template v-for="col in visibleColumns" :key="col.id">
        <div
          class="header-cell"
          :style="columnStyles[col.id]"
        >
          <span class="header-label">{{ col.label }}</span>
          <div
            v-if="col.hideable"
            class="resize-handle"
            @mousedown="startResize($event, col.id, col.width)"
          />
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.commit-list-header {
  display: flex;
  align-items: stretch;
  height: 32px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-secondary);
  user-select: none;
}

.header-trigger {
  display: flex;
  align-items: center;
  padding: 0 12px;
  font-size: 11px;
  color: var(--muted-foreground);
  cursor: pointer;
  border-right: 1px solid var(--border);
}

.header-trigger:hover {
  background: var(--bg-hover);
}

.header-graph-placeholder {
  flex-shrink: 0;
  width: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  color: var(--foreground);
  border-right: 1px solid var(--border);
}

.header-columns {
  display: flex;
  flex: 1;
  overflow: hidden;
  align-items: stretch;
}

.header-cell {
  display: flex;
  align-items: center;
  padding: 0 8px;
  font-size: 11px;
  font-weight: 600;
  color: var(--foreground);
  position: relative;
  overflow: visible;
  flex-shrink: 0;
}

.header-label {
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
  width: 8px;
  cursor: col-resize;
  z-index: 10;
}

.resize-handle::after {
  content: '';
  position: absolute;
  right: 3px;
  top: 50%;
  transform: translateY(-50%);
  width: 2px;
  height: 16px;
  background: var(--border);
  border-radius: 1px;
}

.resize-handle:hover::after {
  background: var(--accent-primary);
}
</style>
