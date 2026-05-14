<template>
  <svg
    class="graph-overlay"
    :style="{ width: graphWidth + 'px', height: totalHeight + 'px', left: graphOffset + 'px' }"
  >
    <g class="lines-layer">
      <path
        v-for="(line, idx) in visibleLines"
        :key="`line-${idx}`"
        :d="getLinePath(line)"
        :stroke="line.color"
        stroke-width="2"
        fill="none"
        stroke-linecap="round"
      />
    </g>
    <g class="nodes-layer">
      <template v-for="node in visibleNodes" :key="node.commit.id">
        <circle
          v-if="!node.isMerge"
          :cx="getLaneX(node.lane)"
          :cy="node.y + ROW_HEIGHT / 2"
          :r="selectedId === node.commit.id ? 6 : 4"
          :fill="getLaneColor(node.lane)"
          stroke="#ffffff"
          :stroke-width="selectedId === node.commit.id ? 2 : 1.5"
          class="commit-node cursor-pointer"
          :class="{ selected: selectedId === node.commit.id }"
          style="pointer-events: auto"
          @click.stop="$emit('select', node.commit)"
        />
        <rect
          v-else
          :x="getLaneX(node.lane) - (selectedId === node.commit.id ? 5 : 4)"
          :y="node.y + ROW_HEIGHT / 2 - (selectedId === node.commit.id ? 5 : 4)"
          :width="selectedId === node.commit.id ? 10 : 8"
          :height="selectedId === node.commit.id ? 10 : 8"
          rx="1"
          :fill="getLaneColor(node.lane)"
          stroke="#ffffff"
          :stroke-width="selectedId === node.commit.id ? 2 : 1.5"
          class="merge-node cursor-pointer"
          :class="{ selected: selectedId === node.commit.id }"
          style="pointer-events: auto"
          @click.stop="$emit('select', node.commit)"
        />
      </template>
    </g>
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Commit } from '../../../types/git'
import { computeGraphLayout, getLaneColor, type GraphLayout } from '../../../utils/graphLayout'

const ROW_HEIGHT = 40
const LANE_WIDTH = 20

const props = defineProps<{
  commits: Commit[]
  selectedId: string | null
  graphWidth: number
  graphOffset: number
  scrollTop: number
  viewportHeight: number
}>()

defineEmits<{
  select: [commit: Commit]
}>()

const layout = computed<GraphLayout>(() => {
  if (props.commits.length === 0) {
    return { nodes: [], lines: [], maxLane: 0, commitLaneMap: new Map() }
  }
  return computeGraphLayout(props.commits)
})

const totalHeight = computed(() => props.commits.length * ROW_HEIGHT)

const BUFFER_PX = 200

const visibleNodes = computed(() => {
  const top = props.scrollTop - BUFFER_PX
  const bottom = props.scrollTop + props.viewportHeight + BUFFER_PX
  return layout.value.nodes.filter(node => node.y >= top && node.y <= bottom)
})

const visibleLines = computed(() => {
  const top = props.scrollTop - BUFFER_PX
  const bottom = props.scrollTop + props.viewportHeight + BUFFER_PX
  return layout.value.lines.filter(line => line.fromY >= top && line.fromY <= bottom + ROW_HEIGHT)
})

function getLaneX(lane: number): number {
  return 12 + lane * LANE_WIDTH
}

function getLinePath(line: { fromLane: number; toLane: number; fromY: number; toY: number }): string {
  const fromX = getLaneX(line.fromLane)
  const toX = getLaneX(line.toLane)
  const fromY = line.fromY + ROW_HEIGHT / 2
  const toY = line.toY + ROW_HEIGHT / 2

  if (fromX === toX) {
    return `M ${fromX} ${fromY} L ${toX} ${toY}`
  }

  const midY = (fromY + toY) / 2
  return `M ${fromX} ${fromY} Q ${fromX} ${midY} ${(fromX + toX) / 2} ${midY} Q ${toX} ${midY} ${toX} ${toY}`
}
</script>

<style scoped>
.graph-overlay {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 1;
}

.commit-node:hover,
.merge-node:hover {
  filter: brightness(1.2);
}

.commit-node.selected,
.merge-node.selected {
  filter: drop-shadow(0 0 4px currentColor);
}
</style>
