<script setup lang="ts">
import { computed } from 'vue'
import type { Commit } from '../../../../types/git'
import { computeGraphLayout, COLUMN_WIDTH, CENTER_X, CIRCLE_RADIUS } from '../../../../utils/graphLayout'

const props = defineProps<{
  commits: Commit[]
}>()

const sortedCommits = computed(() => {
  return [...props.commits].sort((a, b) => a.time - b.time)
})

const layout = computed(() => computeGraphLayout(sortedCommits.value))

function getNodeForRow(rowIndex: number) {
  return layout.value.nodes.find(n => n.rowIndex === rowIndex)
}

function getVerticalSegmentsForRow(rowIndex: number) {
  const y1 = rowIndex * 32 + 16
  const y2 = (rowIndex + 1) * 32 + 16
  return layout.value.segments.filter(s => 
    s.type === 'vertical' && 
    ((s.y1 >= y1 && s.y1 <= y2) || (s.y2 >= y1 && s.y2 <= y2) || (s.y1 < y1 && s.y2 > y2))
  )
}

function getHorizontalSegmentsForRow(rowIndex: number) {
  const y = rowIndex * 32 + 16
  return layout.value.segments.filter(s => 
    s.type === 'horizontal' && Math.abs(s.y1 - y) < 1
  )
}
</script>

<template>
  <div class="graph-rows">
    <div
      v-for="(_, index) in sortedCommits"
      :key="index"
      class="graph-row h-8 relative flex items-center justify-center"
      style="width: 100%"
    >
      <svg
        :width="layout.columns * COLUMN_WIDTH"
        height="32"
        :viewBox="`0 0 ${layout.columns * COLUMN_WIDTH} 32`"
        class="overflow-visible absolute inset-0"
        style="overflow: visible"
      >
        <!-- 该行的垂直连线 -->
        <line
          v-for="(seg, i) in getVerticalSegmentsForRow(index)"
          :key="`v-${i}`"
          :x1="seg.x1"
          :y1="Math.max(0, seg.y1 - index * 32 - 16)"
          :x2="seg.x2"
          :y2="Math.min(32, seg.y2 - index * 32 - 16)"
          :stroke="seg.color"
          stroke-width="1.5"
        />
        <!-- 该行的水平连线 -->
        <line
          v-for="(seg, i) in getHorizontalSegmentsForRow(index)"
          :key="`h-${i}`"
          :x1="seg.x1"
          :y1="16"
          :x2="seg.x2"
          :y2="16"
          :stroke="seg.color"
          stroke-width="1.5"
        />
      </svg>
      <!-- 提交节点 -->
      <template v-if="getNodeForRow(index)">
        <svg
          width="20" height="20"
          viewBox="0 0 20 20"
          class="relative z-10 shrink-0"
        >
          <circle
            cx="10"
            cy="10"
            :r="CIRCLE_RADIUS"
            :fill="getNodeForRow(index)!.color"
            :stroke="getNodeForRow(index)!.color"
            stroke-width="1.5"
          />
          <circle
            v-if="getNodeForRow(index)?.hasRefs"
            cx="10"
            cy="10"
            :r="CIRCLE_RADIUS + 2"
            fill="transparent"
            stroke="rgba(63, 185, 80, 0.5)"
            stroke-width="1.5"
          />
        </svg>
      </template>
    </div>
  </div>
</template>

<style scoped>
.graph-rows {
  display: flex;
  flex-direction: column;
}
</style>
