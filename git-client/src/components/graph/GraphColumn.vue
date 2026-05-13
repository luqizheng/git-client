<template>
  <div
    ref="containerRef"
    class="graph-column"
    :style="{ width: `${width}px` }"
    @scroll="onScroll"
  >
    <svg
      ref="svgRef"
      :viewBox="`0 0 ${width} ${svgHeight}`"
      preserveAspectRatio="none"
      class="w-full"
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
          <NTooltip
            trigger="hover"
            :delay="300"
            placement="right"
            :style="{ maxWidth: '280px' }"
          >
            <template #trigger>
              <circle
                v-if="!node.isMerge"
                :cx="getLaneX(node.lane)"
                :cy="node.y + ROW_HEIGHT / 2"
                :r="selectedId === node.commit.id ? 6 : 4"
                :fill="getLaneColor(node.lane)"
                stroke="#ffffff"
                :stroke-width="selectedId === node.commit.id ? 2 : 1.5"
                class="commit-node cursor-pointer transition-all duration-200"
                :class="{ 'selected': selectedId === node.commit.id }"
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
                class="merge-node cursor-pointer transition-all duration-200"
                :class="{ 'selected': selectedId === node.commit.id }"
                @click.stop="$emit('select', node.commit)"
              />
            </template>

            <div class="text-xs space-y-1 p-1">
              <div class="font-mono text-blue-400">{{ node.commit.id }}</div>
              <div>{{ node.commit.author }}</div>
              <div class="text-gray-400">{{ formatFullTime(node.commit.time) }}</div>
              <div v-if="node.isMerge" class="text-yellow-400">
                {{ node.commit.parent_ids.length }}-way merge
              </div>
              <div v-if="node.commit.refs.length" class="mt-1">
                <span class="text-gray-400">Branches: </span>
                <span v-for="ref in node.commit.refs" :key="ref" class="text-green-400">
                  {{ ref }}
                </span>
              </div>
            </div>
          </NTooltip>

          <g
            v-for="ref in getBranchRefs(node)"
            :key="ref"
            class="branch-tag cursor-pointer"
            @click.stop="$emit('branch-click', ref)"
          >
            <rect
              :x="getLaneX(node.lane) + 10"
              :y="node.y + ROW_HEIGHT / 2 - 8"
              :width="getTagWidth(ref)"
              height="16"
              rx="3"
              :fill="getLaneColor(node.lane) + '20'"
              :stroke="getLaneColor(node.lane)"
              stroke-width="1"
            />
            <text
              :x="getLaneX(node.lane) + 14"
              :y="node.y + ROW_HEIGHT / 2 + 4"
              :fill="getLaneColor(node.lane)"
              font-size="10"
              font-family="monospace"
            >{{ truncateTag(ref) }}</text>
          </g>
        </template>
      </g>
    </svg>

    <div
      v-if="layout.maxLane > 12"
      class="absolute top-2 right-2 text-xs text-yellow-500"
    >
      +{{ layout.maxLane - 12 }} more lanes
    </div>

    <div
      v-if="commits.length === 0"
      class="absolute inset-0 flex items-center justify-center text-gray-500 text-xs"
    >
      No commits
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { NTooltip } from 'naive-ui'
import type { Commit } from '../../types/git'
import { computeGraphLayout, type GraphLayout, type LaneNode } from '../../utils/graphLayout'

const COLORS = [
  '#4fc3f7', '#81c784', '#fff176', '#ff8a65',
  '#ba68c8', '#f06292', '#4db6ac', '#aed581',
  '#90a4ae', '#ffb74d', '#e57373', '#64b5f6',
]

const ROW_HEIGHT = 40
const BUFFER_ROWS = 10
const LANE_WIDTH = 20

const props = defineProps<{
  width?: number
  commits: Commit[]
  selectedId: string | null
}>()

const emit = defineEmits<{
  select: [commit: Commit]
  'branch-click': [branchName: string]
}>()

const containerRef = ref<HTMLElement | null>(null)
const svgRef = ref<SVGSVGElement | null>(null)
const scrollTop = ref(0)
const viewportHeight = ref(600)

const graphWidth = computed(() => props.width ?? 120)

const layout = computed<GraphLayout>(() => {
  if (props.commits.length === 0) {
    return { nodes: [], lines: [], maxLane: 0 }
  }
  return computeGraphLayout(props.commits)
})

const svgHeight = computed(() => {
  return Math.max(600, props.commits.length * ROW_HEIGHT)
})

const visibleRange = computed(() => {
  const startRow = Math.floor(scrollTop.value / ROW_HEIGHT)
  return {
    start: Math.max(0, startRow - BUFFER_ROWS),
    end: Math.min(props.commits.length, startRow + Math.ceil(viewportHeight.value / ROW_HEIGHT) + BUFFER_ROWS)
  }
})

const visibleNodes = computed(() => {
  return layout.value.nodes.slice(visibleRange.value.start, visibleRange.value.end)
})

const visibleLines = computed(() => {
  const { start, end } = visibleRange.value
  const startY = start * ROW_HEIGHT - ROW_HEIGHT
  const endY = end * ROW_HEIGHT + ROW_HEIGHT
  return layout.value.lines.filter(line => {
    return line.fromY >= startY && line.fromY <= endY
  })
})

function getLaneX(lane: number): number {
  return 12 + lane * LANE_WIDTH
}

function getLaneColor(lane: number): string {
  return COLORS[lane % COLORS.length]
}

function getLinePath(line: { fromLane: number; toLane: number; fromY: number; toY: number; color: string }): string {
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

function getBranchRefs(node: LaneNode): string[] {
  return node.commit.refs.filter(ref => !ref.startsWith('tag:'))
}

function truncateTag(tag: string): string {
  const maxLen = 10
  if (tag.length <= maxLen) return tag
  return tag.slice(0, maxLen - 1) + '\u2026'
}

function getTagWidth(tag: string): number {
  return Math.max(40, tag.length * 6 + 8)
}

function formatFullTime(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString()
}

function onScroll() {
  if (!containerRef.value) return
  scrollTop.value = containerRef.value.scrollTop
  viewportHeight.value = containerRef.value.clientHeight
}

onMounted(() => {
  if (containerRef.value) {
    viewportHeight.value = containerRef.value.clientHeight
  }
})

watch(() => props.commits.length, () => {
  if (containerRef.value) {
    viewportHeight.value = containerRef.value.clientHeight
  }
})
</script>

<style scoped>
.graph-column {
  flex-shrink: 0;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
  background: var(--bg-primary, #1a1a1a);
}

.graph-column::-webkit-scrollbar {
  width: 4px;
}

.graph-column::-webkit-scrollbar-thumb {
  background: #444;
  border-radius: 2px;
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
