<template>
  <div class="date-cell" :style="{ width: width + 'px' }">
    <span class="date-text">{{ relativeTime }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Commit } from '../../../types/git'

const props = defineProps<{
  commit: Commit
  width: number
}>()

const relativeTime = computed(() => {
  const diff = Math.floor(Date.now() / 1000) - props.commit.time
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`
  return new Date(props.commit.time * 1000).toLocaleDateString()
})
</script>

<style scoped>
.date-cell {
  padding: 0 8px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}
.date-text {
  font-size: 11px;
  color: var(--text-tertiary, #6a6a6a);
  white-space: nowrap;
}
</style>
