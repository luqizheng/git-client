<template>
  <div class="time-group-header" :style="{ transform: `translateY(${offset ?? 0}px)` }">
    <span class="group-label">{{ group.label }}</span>
    <span class="group-count">{{ group.count }} commits</span>
  </div>
</template>

<script setup lang="ts">
import type { TimeGroup } from '../composables/useVirtualScroll'
defineProps<{
  group: TimeGroup
  offset?: number
}>()
</script>

<style scoped>
.time-group-header {
  height: 28px;
  position: absolute;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  padding: 0 12px;
  gap: 8px;
  background: var(--group-header-bg, rgba(255, 255, 255, 0.03));
  border-top: 1px solid var(--border-color, #3c3c3c);
  border-bottom: 1px solid var(--border-color, #3c3c3c);
}

.group-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary, #e0e0e0);
}

.group-count {
  font-size: 11px;
  color: var(--text-tertiary, #6a6a6a);
}
</style>
