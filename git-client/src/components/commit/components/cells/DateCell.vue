<template>
  <div class="date-cell" :style="{ width: width + 'px' }">
    <span class="date-text">{{ relativeTime }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Commit } from '../../../../types/git'
import { formatRelativeTime } from '../../utils/commitHelpers'

const props = defineProps<{
  commit: Commit
  width: number
}>()

const relativeTime = computed(() => formatRelativeTime(props.commit.time))
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
