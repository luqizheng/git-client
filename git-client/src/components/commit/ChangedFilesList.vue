<template>
  <div class="changed-files">
    <div class="changed-files-header">
      Changed Files ({{ files.length }})
    </div>
    <div v-if="files.length > 0" class="changed-files-scroll overflow-auto">
      <div
        v-for="file in files"
        :key="file.path"
        class="file-item"
        :class="{ selected: selectedFile === file.path }"
        @click="$emit('select', file.path)"
      >
        <span class="file-status" :style="{ color: statusColor(file.status) }">
          {{ statusLabel(file.status) }}
        </span>
        <span class="file-path">{{ file.path }}</span>
      </div>
    </div>
    <div v-else class="no-files">No changed files</div>
  </div>
</template>

<script setup lang="ts">
import type { FileDiff, DiffStatus } from '../../types/git'

defineProps<{
  files: FileDiff[]
  selectedFile: string | null
}>()

defineEmits<{
  select: [path: string]
}>()

function statusLabel(status: DiffStatus): string {
  switch (status) {
    case 'Added':
      return 'A'
    case 'Modified':
      return 'M'
    case 'Deleted':
      return 'D'
    case 'Renamed':
    case 'Copied':
      return 'R'
    default:
      return '?'
  }
}

function statusColor(status: DiffStatus): string {
  switch (status) {
    case 'Added':
      return 'var(--chart-5)'
    case 'Modified':
      return 'var(--secondary)'
    case 'Deleted':
      return 'var(--destructive)'
    case 'Renamed':
    case 'Copied':
      return 'var(--accent)'
    default:
      return 'var(--muted-foreground)'
  }
}
</script>

<style scoped>
.changed-files {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--card);
}

.changed-files-header {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--muted-foreground);
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
}

.changed-files-scroll {
  flex: 1;
  max-height: calc(100% - 36px);
}

.file-item {
  display: flex;
  align-items: center;
  height: 32px;
  padding: 0 12px;
  cursor: pointer;
  transition: background-color 0.1s ease;
  position: relative;
}

.file-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 0;
  background: var(--primary);
  transition: width 0.1s ease;
}

.file-item:hover {
  background: var(--muted);
}

.file-item:hover::before {
  width: 2px;
}

.file-item.selected {
  background: var(--primary);
}

.file-item.selected .file-status {
  color: var(--primary-foreground);
}

.file-item.selected::before {
  width: 2px;
}

.file-status {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  font-weight: 600;
  width: 20px;
  flex-shrink: 0;
  text-align: center;
}

.file-path {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  color: var(--foreground);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.file-item.selected .file-path {
  color: var(--primary-foreground);
}

.no-files {
  font-size: 12px;
  color: var(--muted-foreground);
  padding: 12px;
}
</style>
