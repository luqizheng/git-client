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
      :class="ref.ref_type === 'tag' ? 'bg-secondary/20 text-secondary border border-secondary/50' : 'bg-primary/20 text-primary border border-primary/50'"
    >
      {{ ref.name }}
      <span v-if="ref.is_head" class="text-accent ml-0.5">◆</span>
    </span>
    <span v-if="extraCount > 0" class="text-xs text-muted-foreground">+{{ extraCount }}</span>
  </div>
</template>
