# Task 26: Visual Enhancement — Frontend Component

> **Phase:** 4 — P3 Enhancement | **Dependencies:** none
> **Plan origin:** `docs/superpowers/plans/2026-05-17-git-client-features-implementation.md`

**Files:**
- Create: `git-client/src/components/graph/CommitGraph.vue`

---

- [ ] **Step 1: Create CommitGraph.vue**

```vue
<template>
  <div class="commit-graph" ref="containerRef">
    <div class="graph-canvas">
      <svg ref="svgRef" :viewBox="`0 0 ${width} ${height}`">
        <g v-for="(column, colIndex) in graphData" :key="colIndex" :transform="`translate(${colIndex * columnWidth}, 0)`">
          <circle
            v-for="(node, rowIndex) in column.nodes"
            :key="rowIndex"
            :cx="columnWidth / 2"
            :cy="rowIndex * rowHeight + rowHeight / 2"
            :r="nodeRadius"
            :fill="getBranchColor(node.branch)"
            class="commit-node"
            @click="$emit('commit-click', node.commit)"
          />
          <path
            v-for="(line, lineIndex) in column.lines"
            :key="lineIndex"
            :d="line.path"
            :stroke="getBranchColor(line.branch)"
            stroke-width="3"
            fill="none"
          />
        </g>
      </svg>
    </div>

    <div class="graph-controls">
      <n-button size="small" @click="zoomIn">+</n-button>
      <n-button size="small" @click="zoomOut">-</n-button>
      <n-button size="small" @click="resetZoom">Reset</n-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  graphData: Array<{
    nodes: Array<{
      type: 'commit' | 'merge'
      branch?: string
      commit: any
    }>
    lines: Array<{
      path: string
      branch?: string
    }>
  }>
}>()

defineEmits<{
  'commit-click': [commit: any]
}>()

const svgRef = ref<SVGSVGElement>()
const scale = ref(1)

const columnWidth = 60
const rowHeight = 40
const nodeRadius = 10

const width = computed(() => props.graphData.length * columnWidth)
const height = computed(() => {
  const maxNodes = Math.max(...props.graphData.map(col => col.nodes.length), 1)
  return maxNodes * rowHeight
})

const branchColors = ['#5B8FF9', '#5AD8A6', '#F6BD16', '#E86452', '#6DC8EC', '#9270CA']

function getBranchColor(branch?: string): string {
  if (!branch) return '#999'
  const hash = branch.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return branchColors[hash % branchColors.length]
}

function zoomIn() {
  scale.value = Math.min(scale.value * 1.2, 3)
  updateTransform()
}

function zoomOut() {
  scale.value = Math.max(scale.value / 1.2, 0.5)
  updateTransform()
}

function resetZoom() {
  scale.value = 1
  updateTransform()
}

function updateTransform() {
  if (svgRef.value) {
    svgRef.value.style.transform = `scale(${scale.value})`
    svgRef.value.style.transformOrigin = 'top left'
  }
}
</script>

<style scoped>
.commit-graph {
  width: 100%;
  height: 100%;
  overflow: auto;
}

.graph-canvas {
  min-width: 100%;
  min-height: 100%;
}

.commit-node {
  cursor: pointer;
  transition: r 0.2s;
}

.commit-node:hover {
  r: 14;
}

.graph-controls {
  position: absolute;
  bottom: 8px;
  right: 8px;
  display: flex;
  gap: 4px;
  background: var(--n-color);
  padding: 4px;
  border-radius: 4px;
}
</style>
```

- [ ] **Step 2: Verify types**

```bash
cd git-client && npx vue-tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add git-client/src/components/graph/CommitGraph.vue
git commit -m "feat(graph): add CommitGraph component with zoom"
```
