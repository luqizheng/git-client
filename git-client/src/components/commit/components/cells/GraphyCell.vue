<script setup lang="ts">
import type { Commit } from '../../../../types/git'

defineProps<{
  commit: Commit
}>()
</script>

<template>
  <div class="graphy-cell flex items-center justify-center h-full">
    <svg width="40" height="24" viewBox="0 0 40 24" class="overflow-visible">
      <g :transform="`translate(20, 12)`">
        <circle
          r="6"
          class="fill-primary stroke-border stroke-1"
        />
        <circle
          v-if="commit.refs && commit.refs.length > 0"
          r="8"
          class="fill-transparent stroke-green-500/50 stroke-1"
        />
      </g>
      <g v-if="commit.parent_ids && commit.parent_ids.length > 0">
        <line
          v-if="commit.parent_ids.length === 1"
          x1="20"
          y1="18"
          x2="20"
          y2="24"
          class="stroke-border stroke-1"
        />
        <line
          v-if="commit.parent_ids.length >= 2"
          x1="20"
          y1="18"
          x2="8"
          y2="24"
          class="stroke-border stroke-1"
        />
        <line
          v-if="commit.parent_ids.length >= 2"
          x1="20"
          y1="18"
          x2="32"
          y2="24"
          class="stroke-border stroke-1"
        />
        <line
          v-if="commit.parent_ids.length === 1"
          x1="20"
          y1="6"
          x2="20"
          y2="0"
          class="stroke-border stroke-1"
        />
        <line
          v-if="commit.parent_ids.length === 1"
          x1="20"
          y1="6"
          x2="8"
          y2="0"
          class="stroke-border stroke-0.5 stroke-dashed"
        />
      </g>
      <g v-else>
        <line
          x1="20"
          y1="6"
          x2="20"
          y2="0"
          class="stroke-border stroke-1"
        />
      </g>
    </svg>
  </div>
</template>

<style scoped>
.graphy-cell {
  min-width: 40px;
}
</style>