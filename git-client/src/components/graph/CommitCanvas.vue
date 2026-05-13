<template>
  <canvas
    ref="canvasRef"
    :width="canvasWidth"
    :height="canvasHeight"
    @click="onClick"
    @mousemove="onMouseMove"
    class="cursor-pointer"
  />
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import type { Commit } from '../../types/git'
import { computeGraphLayout, type GraphLayout } from '../../utils/graphLayout'

const ROW_HEIGHT = 40
const NODE_RADIUS = 6
const LANE_WIDTH = 24
const LEFT_PADDING = 20

const props = defineProps<{
  commits: Commit[]
  scrollTop: number
  viewportHeight: number
  selectedId: string | null
}>()

const emit = defineEmits<{
  select: [commit: Commit]
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const canvasWidth = ref(800)
const canvasHeight = ref(600)
let layout: GraphLayout | null = null
let dpr = 1

function computeLayout() {
  if (props.commits.length === 0) {
    layout = { nodes: [], lines: [], maxLane: 0 }
    return
  }
  layout = computeGraphLayout(props.commits)
  const minWidth = LEFT_PADDING + (layout.maxLane + 1) * LANE_WIDTH + 300
  canvasWidth.value = Math.max(800, minWidth)
  canvasHeight.value = Math.max(600, props.commits.length * ROW_HEIGHT)
}

function render() {
  const canvas = canvasRef.value
  if (!canvas || !layout) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  dpr = window.devicePixelRatio || 1
  canvas.width = canvasWidth.value * dpr
  canvas.height = canvasHeight.value * dpr
  ctx.scale(dpr, dpr)

  ctx.clearRect(0, 0, canvasWidth.value, canvasHeight.value)

  const visibleTop = props.scrollTop
  const visibleBottom = props.scrollTop + props.viewportHeight
  const startIdx = Math.max(0, Math.floor(visibleTop / ROW_HEIGHT) - 1)
  const endIdx = Math.min(layout.nodes.length, Math.ceil(visibleBottom / ROW_HEIGHT) + 1)

  for (let i = startIdx; i < endIdx; i++) {
    const node = layout.nodes[i]
    const x = LEFT_PADDING + node.lane * LANE_WIDTH
    const y = node.y + ROW_HEIGHT / 2

    ctx.beginPath()
    ctx.arc(x, y, NODE_RADIUS, 0, Math.PI * 2)
    if (props.selectedId === node.commit.id) {
      ctx.fillStyle = '#fff'
      ctx.strokeStyle = '#4fc3f7'
      ctx.lineWidth = 3
    } else {
      ctx.fillStyle = '#4fc3f7'
      ctx.strokeStyle = '#4fc3f7'
      ctx.lineWidth = 1
    }
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = '#e0e0e0'
    ctx.font = '12px monospace'
    ctx.fillText(
      node.commit.id.slice(0, 7),
      LEFT_PADDING + (layout!.maxLane + 1) * LANE_WIDTH + 10,
      y + 4
    )
    ctx.fillStyle = '#9e9e9e'
    ctx.font = '12px sans-serif'
    ctx.fillText(
      node.commit.message.split('\n')[0],
      LEFT_PADDING + (layout!.maxLane + 1) * LANE_WIDTH + 80,
      y + 4
    )
  }

  for (const line of layout.lines) {
    if (line.fromY + ROW_HEIGHT < visibleTop || line.fromY > visibleBottom) continue
    const fromX = LEFT_PADDING + line.fromLane * LANE_WIDTH
    const toX = LEFT_PADDING + line.toLane * LANE_WIDTH
    const fromY = line.fromY + ROW_HEIGHT / 2
    const toY = line.toY + ROW_HEIGHT / 2

    ctx.beginPath()
    ctx.strokeStyle = line.color
    ctx.lineWidth = 2
    if (fromX === toX) {
      ctx.moveTo(fromX, fromY)
      ctx.lineTo(toX, toY)
    } else {
      ctx.moveTo(fromX, fromY)
      ctx.bezierCurveTo(fromX, fromY + (toY - fromY) / 2, toX, toY - (toY - fromY) / 2, toX, toY)
    }
    ctx.stroke()
  }
}

function onClick(e: MouseEvent) {
  if (!layout) return
  const rect = canvasRef.value!.getBoundingClientRect()
  const y = e.clientY - rect.top + props.scrollTop
  const rowIdx = Math.floor(y / ROW_HEIGHT)
  if (rowIdx >= 0 && rowIdx < layout.nodes.length) {
    emit('select', layout.nodes[rowIdx].commit)
  }
}

function onMouseMove(_e: MouseEvent) {
  // future: tooltip on hover
}

watch(() => [props.commits, props.scrollTop, props.selectedId], () => {
  if (props.commits.length > 0 && (!layout || layout.nodes.length !== props.commits.length)) {
    computeLayout()
  }
  requestAnimationFrame(render)
}, { deep: true })

onMounted(() => {
  computeLayout()
  render()
})
</script>
