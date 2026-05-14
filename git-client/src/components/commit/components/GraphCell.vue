<template>
  <div class="graph-cell" :style="{ width: width + 'px' }">
    <svg class="graph-svg" :width="width" height="40">
      <!-- 垂直连接线 -->
      <template v-for="lane in visibleLanes" :key="`vline-${lane}`">
        <line
          v-if="shouldDrawVerticalLine(lane)"
          :x1="getLaneX(lane)"
          :y1="0"
          :x2="getLaneX(lane)"
          :y2="40"
          :stroke="getLaneColor(lane)"
          stroke-width="2"
        />
      </template>

      <!-- 水平连接线（从当前 commit 到父 commit） -->
      <template v-for="(conn, idx) in outgoingConnections" :key="`conn-${idx}`">
        <path
          :d="getConnectionPath(conn)"
          :stroke="getLaneColor(conn.fromLane)"
          stroke-width="2"
          fill="none"
        />
      </template>

      <!-- Commit 节点 -->
      <template v-if="node">
        <circle
          v-if="!node.isMerge"
          :cx="getLaneX(node.lane)"
          cy="20"
          :r="isSelected ? 6 : 5"
          :fill="getLaneColor(node.lane)"
          stroke="#ffffff"
          :stroke-width="isSelected ? 2 : 1.5"
          class="commit-node"
        />
        <rect
          v-else
          :x="getLaneX(node.lane) - (isSelected ? 5 : 4)"
          :y="20 - (isSelected ? 5 : 4)"
          :width="isSelected ? 10 : 8"
          :height="isSelected ? 10 : 8"
          rx="2"
          :fill="getLaneColor(node.lane)"
          stroke="#ffffff"
          :stroke-width="isSelected ? 2 : 1.5"
          class="merge-node"
        />
      </template>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { GraphNode, GraphConnection } from '../composables/useCommitGraph'
import { getLaneColor } from '../composables/useCommitGraph'

const props = defineProps<{
  width: number
  node: GraphNode | undefined
  connections: GraphConnection[]
  maxLane: number
  isSelected: boolean
}>()

const LANE_WIDTH = 16
const PADDING = 12

const visibleLanes = computed(() => {
  const lanes = new Set<number>()
  for (let i = 0; i <= props.maxLane; i++) {
    lanes.add(i)
  }
  return Array.from(lanes).sort((a, b) => a - b)
})

const outgoingConnections = computed(() => {
  return props.connections.filter(conn => conn.fromCommitId === props.node?.commitId)
})

function getLaneX(lane: number): number {
  return PADDING + lane * LANE_WIDTH
}

function shouldDrawVerticalLine(lane: number): boolean {
  // 如果当前 commit 在这个 lane 上，或者有连接经过这个 lane
  if (props.node?.lane === lane) return true

  // 检查是否有连接经过这个 lane
  return props.connections.some(conn =>
    conn.fromLane === lane || conn.toLane === lane
  )
}

function getConnectionPath(conn: GraphConnection): string {
  const fromX = getLaneX(conn.fromLane)
  const toX = getLaneX(conn.toLane)
  const fromY = 20
  const toY = 40

  if (conn.fromLane === conn.toLane) {
    return `M ${fromX} ${fromY} L ${toX} ${toY}`
  }

  // 曲线连接
  const midY = (fromY + toY) / 2
  return `M ${fromX} ${fromY} Q ${fromX} ${midY} ${(fromX + toX) / 2} ${midY} Q ${toX} ${midY} ${toX} ${toY}`
}
</script>

<style scoped>
.graph-cell {
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
}

.graph-svg {
  overflow: visible;
}

.commit-node,
.merge-node {
  transition: all 0.15s ease;
}

.commit-node:hover,
.merge-node:hover {
  filter: brightness(1.2);
}
</style>
