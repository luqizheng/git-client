<template>
  <div class="graph-cell" :style="{ width: width + 'px' }">
    <svg class="graph-svg" :width="width" height="40">
      <!-- 穿越垂直线：只在需要时画（上下行有commit但当前行没有） -->
      <template v-for="lane in passThroughLanesForRow" :key="`pt-${lane}`">
        <line
          :x1="getLaneX(lane)"
          :y1="0"
          :x2="getLaneX(lane)"
          :y2="40"
          :stroke="getLaneColor(lane)"
          stroke-width="2"
        />
      </template>

      <!-- 从当前commit出发的连接线 -->
      <template v-for="(conn, idx) in outgoingConnections" :key="`conn-${idx}`">
        <path
          :d="getConnectionPath(conn)"
          :stroke="getConnectionColor(conn)"
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
  passThroughLanes: Map<number, number[]>
  rowIndex: number
  isSelected: boolean
}>()

const LANE_WIDTH = 16
const PADDING = 12

const passThroughLanesForRow = computed(() => {
  return props.passThroughLanes.get(props.rowIndex) ?? []
})

const outgoingConnections = computed(() => {
  return props.connections.filter(conn => conn.fromCommitId === props.node?.commitId)
})

function getLaneX(lane: number): number {
  return PADDING + lane * LANE_WIDTH
}

function getConnectionColor(conn: GraphConnection): string {
  return getLaneColor(conn.fromLane)
}

function getConnectionPath(conn: GraphConnection): string {
  const fromX = getLaneX(conn.fromLane)
  const toX = getLaneX(conn.toLane)
  const fromY = 20
  const toY = 40

  if (conn.fromLane === conn.toLane) {
    return `M ${fromX} ${fromY} L ${toX} ${toY}`
  }

  const midY = (fromY + toY) / 2
  return `M ${fromX} ${fromY} C ${fromX} ${midY} ${(fromX + toX) / 2} ${midY} ${toX} ${midY} C ${toX} ${midY} ${toX} ${(midY + toY) / 2} ${toX} ${toY}`
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
