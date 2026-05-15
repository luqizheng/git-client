<template>
  <div
    class="group-header"
    :style="{ transform: `translateY(${offset}px)` }"
    @click="$emit('toggle')"
  >
    <svg
      class="chevron"
      :class="{ collapsed }"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
    </svg>
    <span class="group-label">{{ group.label }}</span>
    <span class="commit-count">{{ group.count }}</span>
  </div>
</template>

<script setup lang="ts">
import type { TimeGroup } from '../composables/useVirtualScroll'

defineProps<{
  group: TimeGroup
  offset: number
  collapsed?: boolean
}>()

defineEmits<{
  toggle: []
}>()
</script>

<style scoped>
.group-header {
  height: 28px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  position: absolute;
  left: 0;
  right: 0;
  cursor: pointer;
  background: var(--bg-secondary, #252526);
  border-bottom: 1px solid var(--border-color, #3c3c3c);
  user-select: none;
}
.group-header:hover {
  background: var(--hover-bg, rgba(255, 255, 255, 0.05));
}
.chevron {
  width: 14px;
  height: 14px;
  color: var(--text-secondary, #969696);
  transition: transform 0.15s ease;
  flex-shrink: 0;
}
.chevron.collapsed {
  transform: rotate(0deg);
}
.chevron:not(.collapsed) {
  transform: rotate(90deg);
}
.group-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-primary, #e0e0e0);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.commit-count {
  font-size: 10px;
  color: var(--text-tertiary, #6a6a6a);
  background: rgba(255, 255, 255, 0.06);
  padding: 1px 6px;
  border-radius: 8px;
  margin-left: 4px;
}
</style>
