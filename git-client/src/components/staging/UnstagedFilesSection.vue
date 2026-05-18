<template>
  <div class="unstaged-section">
    <div class="section-header" @click="expanded = !expanded">
      <div class="header-left">
        <span class="expand-icon">{{ expanded ? '▾' : '▸' }}</span>
        <span class="section-title">Unstaged Files ({{ files.length }})</span>
      </div>
      <div v-if="files.length > 0 && expanded" class="header-actions">
        <button class="action-btn discard-all-btn" @click.stop="$emit('discard-all')" title="Discard All">⟲</button>
        <button class="action-btn stage-all-btn" @click.stop="$emit('stage-all')" title="Stage All">+</button>
      </div>
    </div>
    <div v-show="expanded">
      <div
        v-for="file in files"
        :key="file.path"
        class="file-item"
        @click="$emit('select-file', file.path)"
      >
        <span class="file-status" :style="{ color: statusColor(file.status) }">{{ statusLabel(file.status) }}</span>
        <span class="file-path">{{ file.path }}</span>
        <div class="file-actions">
          <button class="file-action-btn discard-btn" @click.stop="$emit('discard-file', file.path)" title="Discard">⟲</button>
          <button class="file-action-btn stage-btn" @click.stop="$emit('stage', file.path)" title="Stage">+</button>
        </div>
      </div>
      <div v-if="files.length === 0" class="empty-hint">No unstaged changes</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { FileDiff, DiffStatus } from '../../types/git'

defineProps<{ files: FileDiff[] }>()
defineEmits<{
  stage: [path: string]
  'stage-all': []
  'discard-file': [path: string]
  'discard-all': []
  'select-file': [path: string]
}>()

const expanded = ref(true)

function statusLabel(status: DiffStatus): string {
  switch (status) {
    case 'Added': return 'A'
    case 'Modified': return 'M'
    case 'Deleted': return 'D'
    case 'Renamed': return 'R'
    case 'Copied': return 'C'
    default: return '?'
  }
}

function statusColor(status: DiffStatus): string {
  switch (status) {
    case 'Added': return '#73c991'
    case 'Modified': return '#d29922'
    case 'Deleted': return '#f14c4c'
    case 'Renamed': return '#5B8FF9'
    case 'Copied': return '#5B8FF9'
    default: return '#888'
  }
}
</script>

<style scoped>
.unstaged-section {
  border-bottom: 1px solid var(--border-color);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 30px;
  padding: 0 10px;
  cursor: pointer;
  background: var(--bg-secondary);
  user-select: none;
}

.section-header:hover {
  background: var(--bg-hover);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.expand-icon {
  font-size: 10px;
  color: var(--text-muted);
}

.section-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--accent-yellow);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.action-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 13px;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  color: var(--text-secondary);
}

.action-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.discard-all-btn:hover {
  color: var(--accent-red);
}

.stage-all-btn:hover {
  color: var(--accent-green);
}

.file-item {
  display: flex;
  align-items: center;
  height: 28px;
  padding: 0 10px;
  cursor: pointer;
  position: relative;
}

.file-item:hover {
  background: var(--bg-hover);
}

.file-status {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  font-weight: 600;
  width: 16px;
  flex-shrink: 0;
  text-align: center;
}

.file-path {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  padding-left: 6px;
}

.file-actions {
  display: none;
  align-items: center;
  gap: 2px;
  margin-left: auto;
  flex-shrink: 0;
}

.file-item:hover .file-actions {
  display: flex;
}

.file-action-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 13px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  color: var(--text-muted);
}

.file-action-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.discard-btn:hover {
  color: var(--accent-red);
}

.stage-btn:hover {
  color: var(--accent-green);
}

.empty-hint {
  font-size: 12px;
  color: var(--text-muted);
  padding: 8px 12px;
}
</style>
