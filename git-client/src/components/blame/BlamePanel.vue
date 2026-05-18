<template>
  <div class="blame-panel" :class="{ 'is-visible': blameStore.isVisible }">
    <div class="blame-header">
      <span class="header-title">Blame</span>
      <n-button quaternary size="tiny" @click="blameStore.hide">
        <template #icon>
          <n-icon><CloseOutline /></n-icon>
        </template>
      </n-button>
    </div>

    <div v-if="blameStore.isLoading" class="blame-loading">
      <n-spin size="small" />
      <span>Loading blame...</span>
    </div>

    <div v-else-if="blameData" class="blame-content">
      <div
        v-for="line in blameData.lines"
        :key="line.line_number"
        class="blame-line"
        :class="{ 'is-boundary': line.is_boundary }"
        @click="handleLineClick(line)"
      >
        <div class="blame-info">
          <span class="blame-author" :title="line.author_email">{{ truncate(line.author, 12) }}</span>
          <span class="blame-commit" :title="line.summary">{{ truncateHash(line.commit_id) }}</span>
          <span class="blame-date">{{ formatDate(line.timestamp) }}</span>
        </div>
      </div>
    </div>

    <div v-else class="blame-empty">
      <n-icon size="32" class="empty-icon"><InformationCircleOutline /></n-icon>
      <span>Select a file to view blame</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NButton, NIcon, NSpin } from 'naive-ui'
import { CloseOutline, InformationCircleOutline } from '@vicons/ionicons5'
import { useBlameStore } from '../../stores/blame'
import type { BlameLine } from '../../types/git'

const blameStore = useBlameStore()

const props = defineProps<{
  repoPath: string
  filePath: string
  commitId?: string
}>()

const blameData = computed(() => {
  return blameStore.getBlameForFile(props.repoPath, props.filePath)
})

function truncate(str: string, len: number): string {
  return str.length > len ? str.slice(0, len) + '...' : str
}

function truncateHash(hash: string): string {
  return hash.slice(0, 7)
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'today'
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`
  return `${Math.floor(diffDays / 365)}y ago`
}

function handleLineClick(line: BlameLine) {
  emit('commit-click', line.commit_id)
}

const emit = defineEmits<{
  'commit-click': [commitId: string]
}>()
</script>

<style scoped>
.blame-panel {
  width: 0;
  height: 100%;
  background: var(--bg-secondary, #252526);
  border-right: 1px solid var(--border-color, #3c3c3c);
  overflow: hidden;
  transition: width 0.2s ease;
  display: flex;
  flex-direction: column;
}

.blame-panel.is-visible {
  width: 200px;
}

.blame-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-color, #3c3c3c);
  flex-shrink: 0;
}

.header-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary, #e0e0e0);
}

.blame-loading {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;
  color: var(--text-secondary, #8b949e);
  font-size: 12px;
}

.blame-content {
  flex: 1;
  overflow-y: auto;
}

.blame-line {
  padding: 2px 8px;
  font-size: 11px;
  cursor: pointer;
  border-bottom: 1px solid transparent;
}

.blame-line:hover {
  background: var(--bg-hover, rgba(255, 255, 255, 0.05));
}

.blame-line.is-boundary {
  border-bottom-color: var(--border-color, #3c3c3c);
}

.blame-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.blame-author {
  color: var(--text-primary, #e0e0e0);
  font-weight: 500;
}

.blame-commit {
  color: var(--text-link, #58a6ff);
  font-family: monospace;
  font-size: 10px;
}

.blame-date {
  color: var(--text-secondary, #8b949e);
  font-size: 10px;
}

.blame-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  gap: 8px;
  color: var(--text-secondary, #8b949e);
  font-size: 12px;
  text-align: center;
}

.empty-icon {
  color: var(--text-muted, #6e7681);
  opacity: 0.5;
}
</style>
