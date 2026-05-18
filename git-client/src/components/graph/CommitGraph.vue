<template>
  <div
    ref="scrollContainer"
    class="commit-graph"
    @scroll="onScroll"
  >
    <div :style="{ height: totalHeight + 'px', position: 'relative' }">
      <svg
        class="graph-lines"
        :width="graphWidth"
        :height="totalHeight"
        :viewBox="`0 0 ${graphWidth} ${svgHeight}`"
      >
        <path
          v-for="p in visiblePaths"
          :key="p.key"
          :d="p.d"
          :stroke="p.color"
          stroke-width="3"
          fill="none"
        />
        <g v-for="item in visibleNodes" :key="item.commitId">
          <circle
            v-if="!item.isMerge"
            :cx="item.x"
            :cy="item.y"
            r="6"
            :fill="item.branchColor"
          />
          <template v-else>
            <circle
              :cx="item.x"
              :cy="item.y"
              r="8"
              fill="none"
              :stroke="item.branchColor"
              stroke-width="2"
            />
            <circle
              :cx="item.x"
              :cy="item.y"
              r="4"
              :fill="item.branchColor"
            />
          </template>
        </g>
      </svg>

      <div
        v-if="hasWip"
        class="commit-row wip-row"
        :class="{ 'row-selected': isWipSelected }"
        @click="$emit('wip-click')"
        @contextmenu.prevent
      >
        <div class="row-graph-placeholder">
          <svg width="80" :height="ROW_HEIGHT">
            <circle
              cx="14"
              :cy="ROW_HEIGHT / 2"
              r="6"
              fill="none"
              stroke="var(--text-secondary)"
              stroke-width="2"
              stroke-dasharray="4 2"
            />
          </svg>
        </div>
        <div class="row-info">
          <span class="wip-label">// WIP</span>
          <span class="wip-detail">{{ wipUnstagedCount }} unstaged, {{ wipStagedCount }} staged</span>
        </div>
      </div>

      <div
        v-for="item in visibleRows"
        :key="item.row.node.commitId"
        class="commit-row"
        :class="{
          'row-selected': item.row.node.commitId === selectedCommitId,
          'row-hovered': item.row.node.commitId === hoveredId,
        }"
        :style="{ top: item.offset + 'px' }"
        @click="$emit('commit-click', item.row.node.commitId)"
        @contextmenu.prevent="$emit('context-menu', $event, item.row.node.commitId)"
        @mouseenter="hoveredId = item.row.node.commitId"
        @mouseleave="hoveredId = null"
      >
        <div class="row-graph-placeholder" />
        <div class="row-info">
          <div class="ref-tags">
            <span
              v-for="ref in item.row.commit.refs"
              :key="ref.name"
              class="ref-tag"
              :class="getRefClass(ref)"
            >{{ getRefDisplayName(ref) }}</span>
          </div>
          <span class="commit-message">{{ getFirstLine(item.row.commit.message) }}</span>
          <span class="commit-author">{{ item.row.commit.author }}</span>
          <span class="commit-time">{{ formatRelativeTime(item.row.commit.time) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { computeGraphData, type GraphCommit, type GraphRow } from '../commit/utils/graphRenderer'
import { formatRelativeTime, getFirstLine } from '../commit/utils/commitHelpers'

const ROW_HEIGHT = 40
const BUFFER = 15

const props = defineProps<{
  commits: GraphCommit[]
  selectedCommitId: string | null
  hasWip: boolean
  wipUnstagedCount: number
  wipStagedCount: number
}>()

defineEmits<{
  'commit-click': [commitId: string]
  'wip-click': []
  'context-menu': [event: MouseEvent, commitId: string]
}>()

const scrollContainer = ref<HTMLElement | null>(null)
const scrollTop = ref(0)
const viewportHeight = ref(600)
const hoveredId = ref<string | null>(null)

const graphData = computed(() => computeGraphData(props.commits))

const isWipSelected = computed(() => false)

const totalHeight = computed(() => {
  const wipH = props.hasWip ? ROW_HEIGHT : 0
  return graphData.value.rows.length * ROW_HEIGHT + wipH
})

const graphWidth = computed(() => graphData.value.totalWidth)

const svgHeight = computed(() => graphData.value.totalHeight)

const visibleRows = computed(() => {
  const wipOffset = props.hasWip ? ROW_HEIGHT : 0
  const start = Math.max(0, Math.floor(scrollTop.value / ROW_HEIGHT) - BUFFER)
  const end = Math.min(
    graphData.value.rows.length,
    Math.ceil((scrollTop.value + viewportHeight.value) / ROW_HEIGHT) + BUFFER,
  )
  const result: Array<{ row: GraphRow; offset: number }> = []
  for (let i = start; i < end; i++) {
    const row = graphData.value.rows[i]
    if (row) {
      result.push({ row, offset: i * ROW_HEIGHT + wipOffset })
    }
  }
  return result
})

const visiblePaths = computed(() => {
  const start = Math.max(0, Math.floor(scrollTop.value / ROW_HEIGHT) - BUFFER)
  const end = Math.min(
    graphData.value.rows.length,
    Math.ceil((scrollTop.value + viewportHeight.value) / ROW_HEIGHT) + BUFFER,
  )
  const result: Array<{ key: string; d: string; color: string }> = []
  let keyIdx = 0
  for (let i = start; i < end; i++) {
    const row = graphData.value.rows[i]
    if (!row) continue
    for (const p of row.paths) {
      const pathVisible = p.toRow >= start - BUFFER || p.fromRow <= end + BUFFER
      if (pathVisible) {
        result.push({ key: `p-${keyIdx++}`, d: p.d, color: p.color })
      }
    }
  }
  return result
})

const visibleNodes = computed(() => {
  const start = Math.max(0, Math.floor(scrollTop.value / ROW_HEIGHT) - BUFFER)
  const end = Math.min(
    graphData.value.rows.length,
    Math.ceil((scrollTop.value + viewportHeight.value) / ROW_HEIGHT) + BUFFER,
  )
  const result: Array<{ commitId: string; x: number; y: number; branchColor: string; isMerge: boolean }> = []
  for (let i = start; i < end; i++) {
    const row = graphData.value.rows[i]
    if (row) {
      result.push({
        commitId: row.node.commitId,
        x: row.node.x,
        y: row.node.y,
        branchColor: row.node.branchColor,
        isMerge: row.node.isMerge,
      })
    }
  }
  return result
})

function onScroll() {
  const el = scrollContainer.value
  if (!el) return
  scrollTop.value = el.scrollTop
  viewportHeight.value = el.clientHeight
}

watch(() => props.commits, () => {
  if (scrollContainer.value) {
    viewportHeight.value = scrollContainer.value.clientHeight
  }
})

function getRefClass(ref: { name: string; ref_type: string }): string {
  if (ref.name === 'main' || ref.name === 'master') return 'ref-main'
  if (ref.ref_type === 'tag') return 'ref-tag'
  if (ref.ref_type === 'remote') return 'ref-remote'
  return 'ref-branch'
}

function getRefDisplayName(ref: { name: string; ref_type: string }): string {
  if (ref.ref_type === 'remote') {
    const parts = ref.name.split('/')
    return parts.length > 1 ? parts.slice(1).join('/') : ref.name
  }
  return ref.name
}
</script>

<style scoped>
.commit-graph {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
}

.graph-lines {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 0;
}

.commit-row {
  display: flex;
  align-items: center;
  height: 40px;
  width: 100%;
  position: absolute;
  left: 0;
  cursor: pointer;
  transition: background-color 0.15s;
  z-index: 1;
}

.commit-row:hover,
.row-hovered {
  background: var(--bg-hover);
}

.row-selected {
  background: rgba(14, 99, 156, 0.3);
}

.row-selected:hover {
  background: rgba(14, 99, 156, 0.35);
}

.wip-row {
  position: relative;
}

.row-graph-placeholder {
  flex-shrink: 0;
  width: 80px;
  pointer-events: none;
}

.row-info {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding-right: 12px;
  overflow: hidden;
}

.ref-tags {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.ref-tag {
  display: inline-flex;
  align-items: center;
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
}

.ref-main {
  background: var(--accent-green);
  color: #fff;
}

.ref-branch {
  background: var(--accent-blue);
  color: #fff;
}

.ref-remote {
  background: var(--accent-purple);
  color: #fff;
}

.ref-tag {
  background: var(--accent-yellow);
  color: #1b1b1b;
}

.wip-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  font-style: italic;
}

.wip-detail {
  font-size: 11px;
  color: var(--text-muted);
}

.commit-message {
  font-size: 13px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.commit-author {
  font-size: 11px;
  color: var(--text-secondary);
  flex-shrink: 0;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.commit-time {
  font-size: 11px;
  color: var(--text-secondary);
  flex-shrink: 0;
  text-align: right;
  min-width: 50px;
}
</style>
