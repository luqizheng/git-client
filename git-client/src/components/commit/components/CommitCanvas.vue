<template>
  <canvas
    ref="canvasRef"
    class="commit-canvas"
    :width="canvasWidth"
    :height="canvasHeight"
    :style="{ width: canvasWidth + 'px', height: canvasHeight + 'px' }"
  />
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import type { GraphNode, GraphConnection } from '../composables/useCommitGraph'
import { renderFullGraph, ROW_HEIGHT, getGraphWidth } from '../utils/graphRenderer'

const props = defineProps<{
  nodes: Map<string, GraphNode>
  connections: GraphConnection[]
  passThroughLanes: Map<number, number[]>
  idToRowIndex: Map<string, number>
  maxLane: number
  totalRows: number
  scrollTop: number
  viewportHeight: number
  selectedCommitId: string | null
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)

const canvasWidth = getGraphWidth(props.maxLane)
const canvasHeight = props.totalRows * ROW_HEIGHT
const dpr = window.devicePixelRatio || 1

function setupCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return
  canvas.width = canvasWidth * dpr
  canvas.height = canvasHeight * dpr
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
}

function draw() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  const visibleStartY = props.scrollTop
  const visibleEndY = props.scrollTop + props.viewportHeight

  renderFullGraph(
    ctx,
    props.nodes,
    props.connections,
    props.passThroughLanes,
    props.idToRowIndex,
    visibleStartY,
    visibleEndY,
    props.selectedCommitId,
  )
}

watch(
  () => [props.scrollTop, props.selectedCommitId, props.nodes, props.connections],
  () => draw(),
  { flush: 'post' },
)

onMounted(() => {
  setupCanvas()
  draw()
})

onBeforeUnmount(() => {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
})
</script>

<style scoped>
.commit-canvas {
  position: absolute;
  left: 0;
  top: 0;
  pointer-events: none;
}
</style>
