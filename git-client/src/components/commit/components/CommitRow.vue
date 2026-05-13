<template>
  <div
    class="commit-row"
    :class="{ selected, 'drag-over': isDragOver }"
    :style="{ transform: `translateY(${offset ?? 0}px)` }"
    @click="$emit('click')"
    @contextmenu="$emit('contextmenu', $event)"
    @dragover.prevent="$emit('dragover')"
    @dragleave="$emit('dragleave')"
    @drop.prevent="handleDrop($event)"
  >
    <BranchTagCell
      :commit="commit"
      :width="getColumnWidth('branch')"
      class="col-branch"
      @solo="$emit('solo', $event)"
      @hide="$emit('hide', $event)"
    />
    <GraphCell :width="getColumnWidth('graph')" />
    <MessageCell :commit="commit" :width="getColumnWidth('message')" />
    <AuthorCell :commit="commit" :width="getColumnWidth('author')" class="col-author" />
    <DateCell :commit="commit" :width="getColumnWidth('date')" class="col-date" />
  </div>
</template>

<script setup lang="ts">
import type { Commit } from '../../../types/git'
import type { ColumnConfig } from '../composables/useResizableColumns'
import BranchTagCell from './BranchTagCell.vue'
import GraphCell from './GraphCell.vue'
import MessageCell from './MessageCell.vue'
import AuthorCell from './AuthorCell.vue'
import DateCell from './DateCell.vue'

const props = defineProps<{
  commit: Commit
  columns: ColumnConfig[]
  selected: boolean
  isDragOver: boolean
  offset?: number
}>()

const emit = defineEmits<{
  click: []
  contextmenu: [event: MouseEvent]
  dragover: []
  dragleave: []
  drop: [data: { branchName: string; branchType: string }]
  solo: [branchName: string]
  hide: [branchName: string]
}>()

function getColumnWidth(key: string): number {
  return props.columns.find(c => c.key === key)?.width ?? 100
}

function handleDrop(e: DragEvent) {
  const data = e.dataTransfer?.getData('application/x-branch')
  if (data) {
    try {
      emit('drop', JSON.parse(data))
    } catch {}
  }
}
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

.commit-row::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.commit-row:hover::before {
  background: var(--row-hover, rgba(255, 255, 255, 0.05));
}

.commit-row.selected::before {
  background: var(--row-selected, rgba(59, 130, 246, 0.3));
}

.commit-row.drag-over {
  outline: 2px solid var(--drag-over-border, #3b82f6);
  outline-offset: -2px;
}

.col-branch {
  position: sticky;
  left: 0;
  z-index: 2;
  background: var(--bg-primary, #1a1a1a);
}

.col-author {
  position: sticky;
  z-index: 2;
  background: var(--bg-primary, #1a1a1a);
}

.col-date {
  position: sticky;
  right: 0;
  z-index: 2;
  background: var(--bg-primary, #1a1a1a);
}
</style>
