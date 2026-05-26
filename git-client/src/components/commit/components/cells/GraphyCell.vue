<script setup lang="ts">
import { computed } from 'vue'
import type { Commit, CommitRef } from '../../../../types/git'
import { computeGraphLayout, COLUMN_WIDTH, CENTER_X, CIRCLE_RADIUS } from '../../../../utils/graphLayout'

const props = defineProps<{
  commits: Commit[]
}>()

const layout = computed(() => computeGraphLayout(props.commits))

const sortedNodes = computed(() =>
  [...layout.value.nodes].sort((a, b) => a.rowIndex - b.rowIndex)
)

defineExpose({ layout })

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

function visibleRefs(refs: CommitRef[]) {
  return refs.slice(0, 3)
}

function extraRefCount(refs: CommitRef[]) {
  return Math.max(0, refs.length - 3)
}

function labelStyle(ref: CommitRef, color: string) {
  if (ref.ref_type === 'local') {
    return { backgroundColor: color, color: '#fff' }
  }
  if (ref.ref_type === 'remote') {
    return { borderColor: color, color, borderStyle: 'solid' }
  }
  return { borderColor: color, color, borderStyle: 'dashed' }
}
</script>

<template>
  <div class="graph-rows">
    <div
      v-for="node in sortedNodes"
      :key="node.rowIndex"
      class="graph-row h-8 relative overflow-visible"
      :style="{ width: layout.totalWidth + 'px' }"
    >
      <svg
        :width="layout.totalWidth"
        height="32"
        :viewBox="`0 0 ${layout.totalWidth} 32`"
        class="absolute inset-0"
      >
        <line
          v-for="(seg, i) in getVerticalSegmentsForRow(node.rowIndex)"
          :key="`v-${i}`"
          :x1="seg.x1"
          :y1="Math.max(0, seg.y1 - node.rowIndex * 32 - 16)"
          :x2="seg.x2"
          :y2="Math.min(32, seg.y2 - node.rowIndex * 32 - 16)"
          :stroke="seg.color"
          stroke-width="1.5"
        />
        <line
          v-for="(seg, i) in getHorizontalSegmentsForRow(node.rowIndex)"
          :key="`h-${i}`"
          :x1="seg.x1"
          :y1="16"
          :x2="seg.x2"
          :y2="16"
          :stroke="seg.color"
          stroke-width="1.5"
        />
      </svg>
      <template v-if="node">
        <div
          class="absolute top-0 h-full flex items-center overflow-visible"
          :style="{ left: (node.column * COLUMN_WIDTH + CENTER_X - 10) + 'px' }"
        >
          <svg
            width="20" height="20"
            viewBox="0 0 20 20"
            class="shrink-0"
          >
            <circle
              cx="10"
              cy="10"
              :r="CIRCLE_RADIUS"
              :fill="node.color"
              :stroke="node.color"
              stroke-width="1.5"
            />
            <circle
              v-if="node.refs.length > 0"
              cx="10"
              cy="10"
              :r="CIRCLE_RADIUS + 2"
              fill="transparent"
              stroke="rgba(63, 185, 80, 0.5)"
              stroke-width="1.5"
            />
          </svg>
          <div v-if="node.refs.length > 0" class="flex items-center gap-1 ml-2 z-10 overflow-visible">
            <span
              v-for="ref in visibleRefs(node.refs)"
              :key="ref.name"
              class="branch-label text-[11px] px-1.5 py-px rounded whitespace-nowrap max-w-[140px] truncate border"
              :style="labelStyle(ref, node.color)"
              :title="ref.name"
            >
              {{ ref.name }}
            </span>
            <span v-if="extraRefCount(node.refs) > 0" class="text-[11px] text-muted-foreground">+{{ extraRefCount(node.refs) }}</span>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.graph-rows {
  display: flex;
  flex-direction: column;
}
.branch-label {
  line-height: 1.3;
}
</style>
