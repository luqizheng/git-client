<template>
  <div
    class="commit-row"
    :class="{
      selected,
      hovered: isHovered,
      'keyboard-focused': isKeyboardFocused,
    }"
    :style="{ transform: `translateY(${offset}px)` }"
    @click="$emit('click', $event)"
    @contextmenu="$emit('contextmenu', $event)"
    @dblclick="$emit('dblclick', commit)"
    @mouseenter="$emit('mouseenter', commit)"
    @mouseleave="$emit('mouseleave')"
    draggable="true"
    @dragstart="handleDragStart"
  >
    <GraphCell
      :width="graphWidth"
      :node="graphNode"
      :connections="graphConnections"
      :max-lane="maxLane"
      :row-index="rowIndex"
      :pass-through-lanes="passThroughLanes"
      :is-selected="selected"
    />

    <BranchTagCell
      :commit="commit"
      :width="getColumnWidth('branch')"
      class="col-branch"
      @solo="(name) => $emit('solo', name)"
      @hide="(name) => $emit('hide', name)"
    />

    <MessageCell
      :commit="commit"
      :width="getColumnWidth('message')"
      :search-query="searchQuery"
    />

    <AuthorCell
      :commit="commit"
      :width="getColumnWidth('author')"
      class="col-author"
    />

    <DateCell
      :commit="commit"
      :width="getColumnWidth('date')"
      class="col-date"
    />
  </div>
</template>

<script setup lang="ts">
import type { Commit } from '../../../types/git'
import type { ColumnConfig } from '../composables/useResizableColumns'
import type { GraphNode, GraphConnection } from '../composables/useCommitGraph'
import GraphCell from './cells/GraphCell.vue'
import BranchTagCell from './cells/BranchTagCell.vue'
import MessageCell from './cells/MessageCell.vue'
import AuthorCell from './cells/AuthorCell.vue'
import DateCell from './cells/DateCell.vue'

const props = defineProps<{
  commit: Commit
  columns: ColumnConfig[]
  graphWidth: number
  graphNode: GraphNode | undefined
  graphConnections: GraphConnection[]
  maxLane: number
  passThroughLanes: Map<number, number[]>
  rowIndex: number
  selected: boolean
  offset: number
  isHovered?: boolean
  isKeyboardFocused?: boolean
  searchQuery?: string
}>()

const emit = defineEmits<{
  click: [event: MouseEvent]
  contextmenu: [event: MouseEvent]
  dblclick: [commit: Commit]
  mouseenter: [commit: Commit]
  mouseleave: []
  dragstart: [commitId: string]
  solo: [branchName: string]
  hide: [branchName: string]
}>()

function getColumnWidth(key: string): number {
  return props.columns.find(c => c.key === key)?.width ?? 100
}

function handleDragStart(e: DragEvent) {
  e.dataTransfer!.setData('application/x-commit', props.commit.id)
  e.dataTransfer!.effectAllowed = 'move'
  emit('dragstart', props.commit.id)
}
</script>

<style scoped>
.commit-row {
  height: 40px;
  display: flex;
  align-items: center;
  position: absolute;
  left: 0;
  right: 0;
  cursor: pointer;
  transition: background-color 0.15s ease;
}
.commit-row::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.commit-row:hover::before,
.commit-row.hovered::before {
  background: var(--row-hover, rgba(255, 255, 255, 0.05));
}
.commit-row.selected::before {
  background: var(--row-selected, rgba(59, 130, 246, 0.3));
}
.commit-row.keyboard-focused::after {
  content: '';
  position: absolute;
  inset: 0;
  border: 2px solid var(--accent-color, #0078d4);
  border-radius: 2px;
  pointer-events: none;
}
.col-branch {
  position: sticky;
  left: v-bind('graphWidth + "px"');
  z-index: 2;
  background: var(--bg-primary, #1a1a1a);
}
.col-author {
  position: sticky;
  z-index: 2;
  background: var(--bg-primary, #1a1a1a);
}
.col-date {
  position: sticky;
  right: 0;
  z-index: 2;
  background: var(--bg-primary, #1a1a1a);
}
</style>
