<template>
  <div class="message-cell" :style="{ width: width + 'px' }">
    <span class="commit-hash font-mono">{{ commit.id.slice(0, 7) }}</span>
    <span class="commit-message">
      <template v-if="searchQuery">
        <span
          v-for="(part, i) in highlightedParts"
          :key="i"
          :class="{ 'search-highlight': part.isHighlight }"
        >{{ part.text }}</span>
      </template>
      <template v-else>{{ firstLine }}</template>
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Commit } from '../../../../types/git'
import { highlightText, getFirstLine } from '../../utils/commitHelpers'

const props = defineProps<{
  commit: Commit
  width: number
  searchQuery?: string
}>()

const firstLine = computed(() => getFirstLine(props.commit.message))

const highlightedParts = computed(() => {
  if (!props.searchQuery) return [{ text: firstLine.value, isHighlight: false }]
  return highlightText(firstLine.value, props.searchQuery)
})
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
.search-highlight {
  background: rgba(255, 213, 79, 0.4);
  color: #ffd54f;
  border-radius: 2px;
  padding: 0 1px;
}
</style>
