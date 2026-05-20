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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useCommitList } from '../../composables/useCommitList'
import { useColumnConfig } from '../../composables/useColumnConfig'
import { useRightPanelStore } from '../../../../stores/rightPanel'
import { useStagingStore } from '../../../../stores/staging'
import { useRepoStore } from '../../../../stores/repo'
import { useCommitsStore } from '../../../../stores/commits'
import { invoke } from '../../../../utils/ipc'
import { toast } from 'vue-sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { GitCommit } from '@vicons/ionicons5'
import { clsx } from 'clsx'

const rightPanelStore = useRightPanelStore()
const stagingStore = useStagingStore()
const repoStore = useRepoStore()
const commitsStore = useCommitsStore()

const { visibleColumns, columnStyles } = useColumnConfig()

const {
  filterText,
  filteredCommits,
  selectedCommitId,
  contextMenu,
  handleClick,
  hideContextMenu,
} = useCommitList()

const hasWip = computed(() => {
  if (!repoStore.activeRepoPath) return false
  const state = stagingStore.getFileState(repoStore.activeRepoPath)
  return state.unstaged.length > 0 || state.staged.length > 0
})

const isLoading = computed(() => {
  if (!repoStore.activeRepoPath) return false
  return commitsStore.isLoading(repoStore.activeRepoPath)
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

function formatSha(sha: string) {
  return sha.slice(0, 7)
}

function formatTime(timestamp: number) {
  const date = new Date(timestamp * 1000)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`
  if (days < 365) return `${Math.floor(days / 30)} months ago`
  return `${Math.floor(days / 365)} years ago`
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

    <ScrollArea class="flex-1">
      <Table class="min-w-full">
        <TableHeader class="sticky top-0 z-10 bg-card">
          <TableRow class="h-8">
            <template v-for="col in visibleColumns" :key="col.id">
              <TableHead :style="columnStyles[col.id]">
                <span class="text-xs font-medium uppercase tracking-wider">{{ col.label }}</span>
              </TableHead>
            </template>
            <TableHead class="w-32">
              <span class="text-xs font-medium uppercase tracking-wider">Date</span>
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          <template v-if="isLoading">
            <TableRow v-for="i in 8" :key="i" class="h-10">
              <TableCell v-for="col in visibleColumns" :key="col.id">
                <Skeleton class="h-3 w-3/4" />
              </TableCell>
              <TableCell>
                <Skeleton class="h-3 w-24" />
              </TableCell>
            </TableRow>
          </template>

          <template v-else-if="!repoStore.activeRepoPath">
            <TableRow>
              <TableCell :colspan="visibleColumns.length + 1" class="h-32 text-center">
                <GitCommit class="w-12 h-12 opacity-30 mx-auto mb-2" />
                <p class="text-sm text-muted-foreground">Open a repository to view commits</p>
              </TableCell>
            </TableRow>
          </template>

          <template v-else-if="filteredCommits.length === 0">
            <TableRow>
              <TableCell :colspan="visibleColumns.length + 1" class="h-32 text-center">
                <GitCommit class="w-12 h-12 opacity-30 mx-auto mb-2" />
                <p class="text-sm text-muted-foreground">No commits found</p>
              </TableCell>
            </TableRow>
          </template>

          <template v-else>
            <TableRow
              v-if="hasWip"
              class="h-10 hover:bg-accent/50 cursor-pointer transition-colors"
              @click="onWipClick"
            >
              <TableCell class="text-sm" />
              <TableCell>
                <span class="font-medium text-yellow-600">WIP</span>
              </TableCell>
              <TableCell>
                <span class="text-sm text-muted-foreground">{{ wipStagedCount }} staged, {{ wipUnstagedCount }} unstaged</span>
              </TableCell>
              <TableCell class="text-sm text-muted-foreground">Staging</TableCell>
              <TableCell class="text-sm text-muted-foreground">Just now</TableCell>
            </TableRow>

            <TableRow
              v-for="commit in filteredCommits"
              :key="commit.id"
              :class="clsx('hover:bg-accent/50 cursor-pointer transition-colors', selectedCommitId === commit.id ? 'bg-accent' : '')"
              @click="onCommitClick(commit.id)"
              @contextmenu.prevent="onContextMenu($event, commit.id)"
            >
              <TableCell class="text-sm" :style="columnStyles['refs']">
                <span
                  v-for="ref in commit.refs"
                  :key="ref.name"
                  :class="clsx(
                    'inline-block px-1.5 py-0.5 rounded text-xs font-medium mr-0.5',
                    ref.ref_type === 'tag' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                  )"
                >
                  {{ ref.name }}
                </span>
              </TableCell>
              <TableCell class="font-medium text-sm whitespace-pre-wrap break-words leading-snug" :style="columnStyles['message']">
                {{ commit.message }}
              </TableCell>
              <TableCell class="text-sm text-muted-foreground truncate" :style="columnStyles['author']">
                {{ commit.author }}
              </TableCell>
              <TableCell class="text-sm font-mono text-muted-foreground" :style="columnStyles['sha']">
                {{ formatSha(commit.id) }}
              </TableCell>
              <TableCell class="text-sm text-muted-foreground">
                {{ formatTime(commit.time) }}
              </TableCell>
            </TableRow>
          </template>
        </TableBody>
      </Table>
    </ScrollArea>

    <DropdownMenu :open="contextMenu.visible" @update:open="contextMenu.visible = $event">
      <DropdownMenuTrigger as-child>
        <div :style="{ position: 'fixed', left: contextMenu.x + 'px', top: contextMenu.y + 'px' }" />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem @click="onDropdownSelect('cherry-pick')">Cherry-pick</DropdownMenuItem>
        <DropdownMenuItem @click="onDropdownSelect('revert')">Revert</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem @click="onDropdownSelect('rebase')">Rebase</DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Reset</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem @click="onDropdownSelect('reset-soft')">Soft</DropdownMenuItem>
            <DropdownMenuItem @click="onDropdownSelect('reset-mixed')">Mixed</DropdownMenuItem>
            <DropdownMenuItem @click="onDropdownSelect('reset-hard')" class="text-destructive">Hard</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem @click="onDropdownSelect('create-branch')">Create Branch</DropdownMenuItem>
        <DropdownMenuItem @click="onDropdownSelect('create-tag')">Create Tag</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem @click="onDropdownSelect('copy-sha')">Copy SHA</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</template>
