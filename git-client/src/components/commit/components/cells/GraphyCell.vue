<script setup lang="ts">
import { computed } from 'vue'
import type { Commit } from '../../../../types/git'
import { computeGraphLayout, COLUMN_WIDTH, ROW_HEIGHT, CENTER_X, CIRCLE_RADIUS } from '../../../../utils/graphLayout'

const props = defineProps<{
  commits: Commit[]
}>()

// 修复：将数组反转为从最旧到最新（时间升序）
// 因为 props.commits 顺序是 [最新, ..., 最旧]
const sortedCommits = computed(() => {
  // 方式1：直接反转（如果原数组已经是严格的时间倒序）
  // return [...props.commits].reverse()

  // 方式2：更安全，按 time 字段升序排列（旧 → 新）
  return [...props.commits].sort((a, b) => a.time - b.time)
})

const layout = computed(() => computeGraphLayout(sortedCommits.value))
const verticalSegments = computed(() => layout.value.segments.filter(s => s.type === 'vertical'))
const horizontalSegments = computed(() => layout.value.segments.filter(s => s.type === 'horizontal'))
const nodesWithRefs = computed(() => layout.value.nodes.filter(n => n.hasRefs))
</script>

<template>
  <svg
    :width="layout.columns * COLUMN_WIDTH"
    :height="sortedCommits.length * ROW_HEIGHT"
    :viewBox="`0 0 ${layout.columns * COLUMN_WIDTH} ${sortedCommits.length * ROW_HEIGHT}`"
    class="overflow-visible"
  >
    <!-- 垂直连线 -->
    <line
      v-for="seg in verticalSegments"
      :key="`v-${seg.x1}-${seg.y1}`"
      :x1="seg.x1" :y1="seg.y1" :x2="seg.x2" :y2="seg.y2"
      :stroke="seg.color"
      stroke-width="2"
    />

    <!-- 水平连线 -->
    <line
      v-for="seg in horizontalSegments"
      :key="`h-${seg.x1}-${seg.y1}`"
      :x1="seg.x1" :y1="seg.y1" :x2="seg.x2" :y2="seg.y2"
      :stroke="seg.color"
      stroke-width="2"
    />

    <!-- 提交节点 -->
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

    <!-- 带引用标记的外圈 -->
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