<script setup lang="ts">
import { computed } from 'vue'
import type { CommitRef } from '../../../../types/git'

const props = defineProps<{
  refs: CommitRef[]
}>()

const branchTags = computed(() => {
  return props.refs
    .filter(ref => ref.ref_type === 'local' || ref.ref_type === 'tag')
    .slice(0, 3)
})

const extraCount = computed(() => Math.max(0, props.refs.length - 3))
</script>

<template>
  <div class="branch-tag-cell flex items-center gap-1 min-w-0">
    <span
      v-for="ref in branchTags"
      :key="ref.name"
      class="tag-pill text-xs px-1 py-0.5 rounded whitespace-nowrap"
      :class="ref.ref_type === 'tag' ? 'bg-purple-900/50 text-purple-300 border border-purple-700' : 'bg-blue-900/50 text-blue-300 border border-blue-700'"
    >
      {{ ref.name }}
      <span v-if="ref.is_head" class="text-yellow-400 ml-0.5">◆</span>
    </span>
    <span v-if="extraCount > 0" class="text-xs text-[var(--commit-text-secondary)]">+{{ extraCount }}</span>
  </div>
</template>
