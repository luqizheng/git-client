<template>
  <div class="message-cell" :style="{ width: width + 'px' }">
    <span class="commit-hash font-mono">{{ commit.id.slice(0, 7) }}</span>
    <span class="commit-message">{{ firstLine }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Commit } from '../../../types/git'

const props = defineProps<{
  commit: Commit
  width: number
}>()

const firstLine = computed(() => props.commit.message.split('\n')[0])
</script>

<style scoped>
.message-cell {
  padding: 0 8px;
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.commit-hash {
  font-size: 12px;
  color: #4fc3f7;
  flex-shrink: 0;
}

.commit-message {
  font-size: 12px;
  color: var(--text-primary, #e0e0e0);
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}
</style>
