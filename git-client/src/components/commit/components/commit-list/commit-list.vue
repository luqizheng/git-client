<script setup lang="ts">
import { computed } from 'vue'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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

function onDropdownSelect(key: string) {
  hideContextMenu()
  console.log('Selected:', key)
}
</script>

<template>
  <div class="commit-list flex flex-col h-full w-full bg-card">
    <div class="toolbar flex items-center gap-2 px-3 py-2 border-b border-border shrink-0">
      <div class="search-box flex items-center bg-muted rounded px-2 py-1 flex-1 max-w-80">
        <svg class="w-4 h-4 text-muted-foreground mr-1 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          v-model="filterText"
          type="text"
          placeholder="Search commits..."
          class="bg-transparent border-none outline-none text-sm text-foreground w-full placeholder:text-muted-foreground"
        />
        <span v-if="filterText" class="text-xs text-muted-foreground ml-1">{{ filteredCommits.length }}</span>
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

    <DropdownMenu :open="contextMenu.visible" @update:open="contextMenu.visible = $event">
      <DropdownMenuTrigger as-child>
        <div :style="{ position: 'fixed', left: contextMenu.x + 'px', top: contextMenu.y + 'px' }" />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem @click="onDropdownSelect('cherry-pick')">
          Cherry-pick
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem @click="onDropdownSelect('rebase')">
          Rebase
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Reset</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem @click="onDropdownSelect('reset-soft')">Soft</DropdownMenuItem>
            <DropdownMenuItem @click="onDropdownSelect('reset-mixed')">Mixed</DropdownMenuItem>
            <DropdownMenuItem @click="onDropdownSelect('reset-hard')" class="text-destructive">Hard</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem @click="onDropdownSelect('create-branch')">
          Create Branch
        </DropdownMenuItem>
        <DropdownMenuItem @click="onDropdownSelect('create-tag')">
          Create Tag
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem @click="onDropdownSelect('copy-sha')">
          Copy SHA
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</template>
