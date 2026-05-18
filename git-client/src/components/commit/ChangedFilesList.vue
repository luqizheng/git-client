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
      return '#e2c08d'
    case 'Modified':
      return '#73c991'
    case 'Deleted':
      return '#f14c4c'
    case 'Renamed':
    case 'Copied':
      return '#dcdcaa'
    default:
      return '#888'
  }
}
</script>

<style scoped>
.changed-files {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #2d2d2d;
}

.changed-files-header {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #6e6e6e;
  padding: 8px 12px;
  border-bottom: 1px solid #3c3c3c;
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
  background: #0e639c;
  transition: width 0.1s ease;
}

.file-item:hover {
  background: #3c3c3c;
}

.file-item:hover::before {
  width: 2px;
}

.file-item.selected {
  background: #094771;
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
  color: #cccccc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.file-item.selected .file-path {
  color: #ffffff;
}

.no-files {
  font-size: 12px;
  color: #6e6e6e;
  padding: 12px;
}
</style>
