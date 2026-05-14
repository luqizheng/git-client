<template>
  <div
    class="commit-row"
    :class="{ selected }"
    :style="{ transform: `translateY(${offset}px)` }"
    @click="$emit('click')"
    @contextmenu="$emit('contextmenu', $event)"
  >
    <GraphCell
      :width="graphWidth"
      :node="graphNode"
      :connections="graphConnections"
      :max-lane="maxLane"
      :is-selected="selected"
    />

    <BranchTagCell
      :commit="commit"
      :width="getColumnWidth('branch')"
      class="col-branch"
    />

    <MessageCell
      :commit="commit"
      :width="getColumnWidth('message')"
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
import GraphCell from './GraphCell.vue'
import BranchTagCell from './BranchTagCell.vue'
import MessageCell from './MessageCell.vue'
import AuthorCell from './AuthorCell.vue'
import DateCell from './DateCell.vue'

const props = defineProps<{
  commit: Commit
  columns: ColumnConfig[]
  graphWidth: number
  graphNode: GraphNode | undefined
  graphConnections: GraphConnection[]
  maxLane: number
  selected: boolean
  offset: number
}>()

const emit = defineEmits<{
  click: []
  contextmenu: [event: MouseEvent]
}>()

function getColumnWidth(key: string): number {
  return props.columns.find(c => c.key === key)?.width ?? 100
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

.commit-row:hover::before {
  background: var(--row-hover, rgba(255, 255, 255, 0.05));
}

.commit-row.selected::before {
  background: var(--row-selected, rgba(59, 130, 246, 0.3));
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
