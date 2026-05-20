<script setup lang="ts">
import { computed } from 'vue'
import type { Commit } from '../../../../types/git'
import { computeGraphLayout, COLUMN_WIDTH, ROW_HEIGHT, CENTER_X, CIRCLE_RADIUS } from '../../../../utils/graphLayout'

const props = defineProps<{
  commits: Commit[]
}>()

const layout = computed(() => computeGraphLayout(props.commits))
const verticalSegments = computed(() => layout.value.segments.filter(s => s.type === 'vertical'))
const horizontalSegments = computed(() => layout.value.segments.filter(s => s.type === 'horizontal'))
const nodesWithRefs = computed(() => layout.value.nodes.filter(n => n.hasRefs))
</script>

<template>
  {{ commits }}
  <svg
    :width="layout.columns * COLUMN_WIDTH"
    :height="commits.length * ROW_HEIGHT"
    :viewBox="`0 0 ${layout.columns * COLUMN_WIDTH} ${commits.length * ROW_HEIGHT}`"
    class="overflow-visible"
  >
    <line
      v-for="seg in verticalSegments"
      :key="`v-${seg.x1}-${seg.y1}`"
      :x1="seg.x1" :y1="seg.y1" :x2="seg.x2" :y2="seg.y2"
      :stroke="seg.color"
      stroke-width="2"
    />

    <line
      v-for="seg in horizontalSegments"
      :key="`h-${seg.x1}-${seg.y1}`"
      :x1="seg.x1" :y1="seg.y1" :x2="seg.x2" :y2="seg.y2"
      :stroke="seg.color"
      stroke-width="2"
    />

    <circle
      v-for="node in layout.nodes"
      :key="node.commitId"
      :cx="node.column * COLUMN_WIDTH + CENTER_X"
      :cy="node.rowIndex * ROW_HEIGHT + ROW_HEIGHT / 2"
      :r="CIRCLE_RADIUS"
      :fill="node.color"
      :stroke="node.color"
      stroke-width="2"
    />

    <circle
      v-for="node in nodesWithRefs"
      :key="`ref-${node.commitId}`"
      :cx="node.column * COLUMN_WIDTH + CENTER_X"
      :cy="node.rowIndex * ROW_HEIGHT + ROW_HEIGHT / 2"
      :r="CIRCLE_RADIUS + 2"
      fill="transparent"
      stroke="rgba(63, 185, 80, 0.5)"
      stroke-width="2"
    />
  </svg>
</template>

<style scoped>
svg {
  min-width: v-bind("`${COLUMN_WIDTH}px`");
}
</style>
