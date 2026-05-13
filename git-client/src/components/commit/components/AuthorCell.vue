<template>
  <div class="author-cell" :style="{ width: width + 'px' }">
    <span class="author-name">{{ commit.author }}</span>
  </div>
</template>

<script setup lang="ts">
import type { Commit } from '../../../types/git'
defineProps<{ commit: Commit; width: number }>()
</script>

<style scoped>
.author-cell {
  padding: 0 8px;
  overflow: hidden;
  display: flex;
  align-items: center;
}
.author-name {
  font-size: 12px;
  color: var(--text-secondary, #969696);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
