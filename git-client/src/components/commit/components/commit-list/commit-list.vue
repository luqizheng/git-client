<script setup lang="ts">
import { h, computed } from 'vue'
import { NDropdown } from 'naive-ui'
import type { DropdownOption } from 'naive-ui'
import CommitGraph from '../../../graph/CommitGraph.vue'
import type { GraphCommit } from '../../utils/graphRenderer'
import { useCommitList } from '../../composables/useCommitList'
import { useRightPanelStore } from '../../../../stores/rightPanel'
import { useStagingStore } from '../../../../stores/staging'
import { useRepoStore } from '../../../../stores/repo'

const rightPanelStore = useRightPanelStore()
const stagingStore = useStagingStore()
const repoStore = useRepoStore()

const {
  filterText,
  filteredCommits,
  selectedCommitId,
  contextMenu,
  handleClick,
  hideContextMenu,
} = useCommitList()

const graphCommits = computed<GraphCommit[]>(() =>
  filteredCommits.value.map(c => ({
    id: c.id,
    parents: c.parent_ids,
    refs: c.refs.map(r => ({ name: r.name, ref_type: r.ref_type })),
    message: c.message,
    author: c.author,
    time: c.time,
  })),
)

const hasWip = computed(() => {
  if (!repoStore.activeRepoPath) return false
  const state = stagingStore.getFileState(repoStore.activeRepoPath)
  return state.unstaged.length > 0 || state.staged.length > 0
})

const wipUnstagedCount = computed(() => {
  if (!repoStore.activeRepoPath) return 0
  return stagingStore.getFileState(repoStore.activeRepoPath).unstaged.length
})

const wipStagedCount = computed(() => {
  if (!repoStore.activeRepoPath) return 0
  return stagingStore.getFileState(repoStore.activeRepoPath).staged.length
})

function onCommitClick(commitId: string) {
  const commit = filteredCommits.value.find(c => c.id === commitId)
  if (commit) handleClick(commit)
}

function onWipClick() {
  rightPanelStore.showPanel('staging')
}

function onContextMenu(e: MouseEvent, commitId: string) {
  const commit = filteredCommits.value.find(c => c.id === commitId)
  if (commit) {
    contextMenu.value = { visible: true, x: e.clientX, y: e.clientY, commit }
  }
}

function onDropdownSelect(_key: string) {
  hideContextMenu()
}

const menuOptions = computed<DropdownOption[]>(() => {
  if (!contextMenu.value.commit) return []
  return [
    { key: 'cherry-pick', label: 'Cherry-pick', icon: renderIcon('cherry') },
    { key: 'divider-1', type: 'divider' },
    { key: 'rebase', label: 'Rebase', icon: renderIcon('rebase') },
    {
      key: 'reset',
      label: 'Reset',
      children: [
        { key: 'reset-soft', label: 'Soft' },
        { key: 'reset-mixed', label: 'Mixed' },
        { key: 'reset-hard', label: 'Hard', props: { style: 'color: var(--accent-red, #e57373)' } },
      ],
    },
    { key: 'divider-2', type: 'divider' },
    { key: 'create-branch', label: 'Create Branch', icon: renderIcon('branch') },
    { key: 'create-tag', label: 'Create Tag', icon: renderIcon('tag') },
    { key: 'divider-3', type: 'divider' },
    { key: 'copy-sha', label: 'Copy SHA', icon: renderIcon('copy') },
  ]
})

const SVG_PATHS: Record<string, string> = {
  cherry: 'M12 2a7 7 0 00-7 7c0 2.38 1.19 4.47 3 5.74V17a2 2 0 002 2h4a2 2 0 002-2v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 00-7-7zM9 21h6',
  rebase: 'M4 12h16m-4-4l4 4-4 4',
  branch: 'M6 3v12m0 0a3 3 0 100 6 3 3 0 000-6zm12-6a3 3 0 100 6 3 3 0 000-6zM6 9h12',
  tag: 'M20.59 13.41l-7.17-7.17a2 2 0 00-1.41-.59H5a2 2 0 00-2 2v6.83a2 2 0 00.59 1.41l7.17 7.17a2 2 0 002.83 0l7-7a2 2 0 000-2.83zM8 11a1 1 0 110-2 1 1 0 010 2z',
  copy: 'M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z',
}

function renderIcon(name: string) {
  return () => h('svg', {
    class: 'w-4 h-4',
    fill: 'none',
    stroke: 'currentColor',
    viewBox: '0 0 24 24',
    innerHTML: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${SVG_PATHS[name] ?? ''}"/>`,
  })
}
</script>

<template>
  <div class="commit-list flex flex-col h-full w-full bg-[var(--commit-bg,transparent)]">
    <div class="toolbar flex items-center gap-2 px-3 py-2 border-b border-[var(--commit-border,#3c3c3c)] shrink-0">
      <div class="search-box flex items-center bg-[var(--commit-bg-hover,rgba(255,255,255,0.05))] rounded px-2 py-1 flex-1 max-w-80">
        <svg class="w-4 h-4 text-[var(--commit-text-secondary)] mr-1 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          v-model="filterText"
          type="text"
          placeholder="Search commits..."
          class="bg-transparent border-none outline-none text-sm text-[var(--commit-text)] w-full placeholder:text-[var(--commit-text-secondary)]"
        />
        <span v-if="filterText" class="text-xs text-[var(--commit-text-secondary)] ml-1">{{ filteredCommits.length }}</span>
      </div>
    </div>

    <CommitGraph
      :commits="graphCommits"
      :selected-commit-id="selectedCommitId"
      :has-wip="hasWip"
      :wip-unstaged-count="wipUnstagedCount"
      :wip-staged-count="wipStagedCount"
      @commit-click="onCommitClick"
      @wip-click="onWipClick"
      @context-menu="onContextMenu"
    />

    <NDropdown
      :show="contextMenu.visible"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :options="menuOptions"
      trigger="manual"
      to="body"
      animated
      @select="onDropdownSelect"
      @clickoutside="hideContextMenu"
    />
  </div>
</template>
