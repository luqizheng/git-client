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
import CommitListHeader from '../../CommitListHeader.vue'
import type { GraphCommit } from '../../utils/graphRenderer'
import { useCommitList } from '../../composables/useCommitList'
import { useColumnConfig } from '../../composables/useColumnConfig'
import { useRightPanelStore } from '../../../../stores/rightPanel'
import { useStagingStore } from '../../../../stores/staging'
import { useRepoStore } from '../../../../stores/repo'
import { useCommitsStore } from '../../../../stores/commits'
import { invoke } from '../../../../utils/ipc'
import { toast } from 'vue-sonner'

const rightPanelStore = useRightPanelStore()
const stagingStore = useStagingStore()
const repoStore = useRepoStore()
const commitsStore = useCommitsStore()

const { columnStyles } = useColumnConfig()

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

async function onDropdownSelect(key: string) {
  const commit = contextMenu.value.commit
  hideContextMenu()
  if (!commit || !repoStore.activeRepoPath) return

  try {
    switch (key) {
      case 'cherry-pick':
        await invoke<void>('cherry_pick', { repoPath: repoStore.activeRepoPath, commitId: commit.id })
        toast.success(`Cherry-picked ${commit.id.slice(0, 7)}`)
        break
      case 'rebase':
        toast.info('Interactive rebase coming in Phase 2c')
        return
      case 'reset-soft':
        await invoke<void>('reset_commit', { repoPath: repoStore.activeRepoPath, commitId: commit.id, mode: 'soft' })
        toast.success('Soft reset successful')
        break
      case 'reset-mixed':
        await invoke<void>('reset_commit', { repoPath: repoStore.activeRepoPath, commitId: commit.id, mode: 'mixed' })
        toast.success('Mixed reset successful')
        break
      case 'reset-hard':
        await invoke<void>('reset_commit', { repoPath: repoStore.activeRepoPath, commitId: commit.id, mode: 'hard' })
        toast.success('Hard reset successful')
        break
      case 'revert':
        await invoke<void>('revert_commit', { repoPath: repoStore.activeRepoPath, commitId: commit.id })
        toast.success('Revert successful')
        break
      case 'create-branch':
        toast.info('Create branch dialog coming soon')
        return
      case 'create-tag':
        toast.info('Create tag dialog coming soon')
        return
      case 'copy-sha':
        await navigator.clipboard.writeText(commit.id)
        toast.success('SHA copied')
        return
      default:
        return
    }
    await commitsStore.fetchLogs(repoStore.activeRepoPath)
  } catch (e) {
    toast.error(String(e))
  }
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

    <CommitListHeader />

    <CommitGraph
      :commits="graphCommits"
      :selected-commit-id="selectedCommitId"
      :has-wip="hasWip"
      :wip-unstaged-count="wipUnstagedCount"
      :wip-staged-count="wipStagedCount"
      :column-styles="columnStyles"
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
        <DropdownMenuItem @click="onDropdownSelect('revert')">
          Revert
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
