<template>
  <div
    class="commit-list"
    tabindex="0"
    @keydown="handleKeyDown"
  >
    <CommitToolbar
      :filter-type="filterType"
      :match-count="filteredCommits.length !== displayCommits.length ? filteredCommits.length : null"
      :grouping-enabled="groupingEnabled"
      @update:filter-type="filterType = $event"
      @search="filterText = $event"
      @toggle-grouping="groupingEnabled = !groupingEnabled"
      @show-all="onShowAll"
    />

    <ColumnHeader
      :columns="visibleColumns"
      :graph-width="graphWidth"
      @resize="resizeColumn"
    />

    <div
      ref="scrollContainer"
      class="scroll-container"
      @scroll="onScroll"
    >
      <CommitCanvas
        :nodes="graph.nodes"
        :connections="graph.connections"
        :pass-through-lanes="graph.passThroughLanes"
        :id-to-row-index="idToRowIdx"
        :max-lane="graph.maxLane"
        :total-rows="filteredCommits.length"
        :scroll-top="scrollTop"
        :viewport-height="viewportHeight"
        :selected-commit-id="selectedCommitId"
      />
      <div
        class="scroll-content"
        :style="{ height: totalHeight + 'px' }"
      >
        <template v-for="item in visibleItems" :key="item.type === 'group' ? item.group.key : item.commit.id">
          <GroupHeader
            v-if="item.type === 'group'"
            :group="item.group"
            :offset="item.offset"
            :collapsed="collapsedGroups.has(item.group.key)"
            @toggle="toggleGroup(item.group.key)"
          />
          <CommitRow
            v-else
            :commit="item.commit"
            :columns="visibleColumns"
            :graph-width="graphWidth"
            :graph-node="graph.nodes.get(item.commit.id)"
            :graph-connections="graph.connections"
            :max-lane="graph.maxLane"
            :pass-through-lanes="graph.passThroughLanes"
            :row-index="idToRowIdx.get(item.commit.id) ?? 0"
            :selected="item.commit.id === selectedCommitId"
            :is-hovered="item.commit.id === hoveredId"
            :is-keyboard-focused="isFocusedItem(item)"
            :offset="item.offset"
            :search-query="filterText || undefined"
            @click="handleClick(item.commit, $event)"
            @contextmenu="handleContextMenu($event, item.commit)"
            @dblclick="onDblClick(item.commit)"
            @mouseenter="setHovered(item.commit.id)"
            @mouseleave="setHovered(null)"
            @dragstart="onDragStart"
            @solo="onSoloBranch"
            @hide="onHideBranch"
          />
        </template>
      </div>

      <div v-if="loadingMore" class="loading-more">
        <span class="spinner"></span>
        Loading more commits...
      </div>

      <div v-if="!hasMore && displayCommits.length > 0" class="no-more">
        No more commits
      </div>
    </div>

    <ContextMenu
      :visible="contextMenuState.visible"
      :x="contextMenuState.x"
      :y="contextMenuState.y"
      :commit="contextMenuState.commit"
      @close="closeContextMenu"
      @cherry-pick="onMenuAction('cherry-pick', $event)"
      @rebase="onMenuAction('rebase', $event)"
      @reset-soft="onMenuAction('reset-soft', $event)"
      @reset-mixed="onMenuAction('reset-mixed', $event)"
      @reset-hard="onMenuAction('reset-hard', $event)"
      @create-branch="onMenuAction('create-branch', $event)"
      @create-tag="onMenuAction('create-tag', $event)"
      @copy-sha="onMenuAction('copy-sha', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { useCommitList } from './composables/useCommitList'
import { useCommitsStore } from '../../stores/commits'
import { useRepoStore } from '../../stores/repo'
import type { Commit } from '../../types/git'
import CommitToolbar from './components/CommitToolbar.vue'
import ColumnHeader from './components/ColumnHeader.vue'
import GroupHeader from './components/GroupHeader.vue'
import CommitRow from './components/CommitRow.vue'
import CommitCanvas from './components/CommitCanvas.vue'
import ContextMenu from './components/ContextMenu.vue'

const {
  scrollContainer: _scrollContainer,
  columns: _columns,
  visibleColumns,
  graph,
  graphWidth,
  displayCommits,
  filteredCommits,
  totalHeight,
  visibleItems,
  scrollTop,
  viewportHeight,
  selectedCommitId,
  hoveredId,
  contextMenuState,
  filterText,
  filterType,
  loading: _loading,
  loadingMore,
  hasMore,
  groupingEnabled,
  collapsedGroups,
  focusedIndex,
  idToRowIdx,
  selectCommit,
  handleClick: onRowClick,
  setHovered,
  openContextMenu,
  closeContextMenu,
  handleKeyDown,
  onScroll,
  toggleGroup,
  resizeColumn,
} = useCommitList()

const emit = defineEmits<{
  select: [commit: Commit]
  'cherry-pick': [commitId: string]
  'show-all': []
}>()

const repo = useRepoStore()
const commitsStore = useCommitsStore()

function handleContextMenu(e: MouseEvent, commit: Commit) {
  e.preventDefault()
  selectCommit(commit)
  openContextMenu(e.clientX, e.clientY, commit)
}

function handleClick(commit: Commit, e?: MouseEvent) {
  const ctrlKey = e?.ctrlKey ?? false
  const shiftKey = e?.shiftKey ?? false
  onRowClick(commit, ctrlKey, shiftKey)
  selectCommit(commit)
  emit('select', commit)
}

function isFocusedItem(item: { type: string; commit?: Commit }): boolean {
  if (item.type !== 'commit' || !item.commit) return false
  const commitItems = visibleItems.value.filter(v => v.type === 'commit')
  const idx = commitItems.findIndex(v => v.type === 'commit' && v.commit.id === item.commit!.id)
  return idx === focusedIndex.value
}

function onDblClick(commit: Commit) {
  emit('select', commit)
}

function onDragStart(commitId: string) {
  emit('cherry-pick', commitId)
}

function onSoloBranch(name: string) {
  if (repo.activeRepoPath) {
    commitsStore.filterByBranch(repo.activeRepoPath, name)
  }
}

function onHideBranch(_name: string) {
}

function onShowAll() {
  if (repo.activeRepoPath) {
    commitsStore.clearBranchFilter(repo.activeRepoPath)
  }
  emit('show-all')
}

function onMenuAction(action: string, commitId: string) {
  switch (action) {
    case 'cherry-pick':
      emit('cherry-pick', commitId)
      break
    case 'copy-sha':
      break
    default:
      break
  }
}
</script>

<style scoped>
.commit-list {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  border-right: 1px solid var(--border-color, #3c3c3c);
  background: var(--bg-primary, #1a1a1a);
  outline: none;
}

.scroll-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
}

.scroll-container::-webkit-scrollbar {
  width: 8px;
}

.scroll-container::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb, rgba(255, 255, 255, 0.15));
  border-radius: 4px;
}

.scroll-container::-webkit-scrollbar-thumb:hover {
  background: var(--scrollbar-thumb-hover, rgba(255, 255, 255, 0.25));
}

.scroll-content {
  position: relative;
}

.loading-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  font-size: 12px;
  color: var(--text-secondary, #969696);
}

.spinner {
  width: 12px;
  height: 12px;
  border: 2px solid var(--border-color, #3c3c3c);
  border-top-color: var(--accent-color, #0078d4);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.no-more {
  text-align: center;
  padding: 16px;
  font-size: 12px;
  color: var(--text-secondary, #969696);
  opacity: 0.6;
}
</style>
