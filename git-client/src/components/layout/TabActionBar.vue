<template>
  <div class="tab-action-bar">
    <div class="tab-bar-left">
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="ghost" size="sm" class="bar-btn repo-switch-btn">
            <FolderOpen class="w-3.5 h-3.5 mr-1" />
            {{ currentRepoName }}
            <ChevronDown class="w-3 h-3 ml-1 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem v-for="r in repoList" :key="r.key" @click="handleRepoSwitch(r.key)">
            {{ r.label }}
          </DropdownMenuItem>
          <DropdownMenuSeparator v-if="repoList.length > 0" />
          <DropdownMenuItem @click="handleRepoSwitch('__open__')">Open Repository...</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="ghost" size="sm" class="bar-btn branch-switch-btn" :disabled="!repo.activeRepoPath">
            <GitBranch class="w-3.5 h-3.5 mr-1" />
            {{ currentBranchName || 'Branch' }}
            <ChevronDown class="w-3 h-3 ml-1 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem v-for="b in localBranches" :key="b.name" @click="switchBranch(b.name)">
            <span class="ref-dot" :class="b.is_head ? 'dot-current' : 'dot-other'" />{{ b.name }}
          </DropdownMenuItem>
          <DropdownMenuSeparator v-if="localBranches.length > 0" />
          <DropdownMenuItem @click="$emit('create-branch')">New Branch...</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button variant="ghost" size="icon" class="bar-btn h-7 w-7" title="Settings" @click="showSettings = true">
        <SettingsOutline class="w-4 h-4" />
      </Button>
    </div>

    <div class="tab-bar-center">
      <Button variant="ghost" size="icon" class="bar-btn h-6 w-6" disabled title="Undo">
        <ArrowUndoOutline class="w-3.5 h-3.5" />
      </Button>
      <Button variant="ghost" size="icon" class="bar-btn h-6 w-6" disabled title="Redo">
        <ArrowRedoOutline class="w-3.5 h-3.5" />
      </Button>

      <div class="bar-separator" />

      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="ghost" size="sm" :disabled="!repo.activeRepoPath || isSyncing" class="bar-btn">
            <Refresh class="w-3.5 h-3.5 mr-1" />
            Fetch
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem @click="$emit('fetch')">Fetch All</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button variant="ghost" size="sm" :disabled="!repo.activeRepoPath || isSyncing" class="bar-btn" title="Pull" @click="$emit('pull')">
        <ArrowDown class="w-3.5 h-3.5 mr-1" />
        Pull
      </Button>
      <Button variant="ghost" size="sm" :disabled="!repo.activeRepoPath || isSyncing" class="bar-btn" title="Push" @click="$emit('push')">
        <ArrowUp class="w-3.5 h-3.5 mr-1" />
        Push
      </Button>

      <div class="bar-separator" />

      <Button variant="ghost" size="icon" class="bar-btn h-6 w-6" :disabled="!repo.activeRepoPath" title="Branch" @click="$emit('create-branch')">
        <GitBranch class="w-3.5 h-3.5" />
      </Button>
      <Button variant="ghost" size="icon" class="bar-btn h-6 w-6" :disabled="!repo.activeRepoPath" title="Stash" @click="$emit('stash')">
        <Archive class="w-3.5 h-3.5" />
      </Button>
      <Button variant="ghost" size="icon" class="bar-btn h-6 w-6" :disabled="!repo.activeRepoPath" title="Pop Stash" @click="$emit('pop-stash')">
        <ArchiveOutline class="w-3.5 h-3.5" />
      </Button>

      <div class="bar-separator" />

      <Button variant="ghost" size="icon" class="bar-btn h-6 w-6" :disabled="!repo.activeRepoPath" title="Revert">
        <ReturnDownBack class="w-3.5 h-3.5" />
      </Button>
      <Button variant="ghost" size="icon" class="bar-btn h-6 w-6" :disabled="!repo.activeRepoPath" title="Merge">
        <GitMerge class="w-3.5 h-3.5" />
      </Button>
    </div>

    <div class="tab-bar-right">
      <Button variant="ghost" size="icon" class="bar-btn h-6 w-6" :disabled="!repo.activeRepoPath" title="Refresh" @click="handleRefresh">
        <Refresh class="w-3.5 h-3.5" />
      </Button>
      <Button variant="ghost" size="icon" class="bar-btn h-6 w-6" :disabled="!repo.activeRepoPath" title="Search">
        <Search class="w-3.5 h-3.5" />
      </Button>
    </div>

    <settings-panel v-model="showSettings" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { open } from '@tauri-apps/plugin-dialog'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  FolderOpen, ChevronDown, GitBranch, Archive, Refresh, ArrowDown, ArrowUp,
  ArrowUndoOutline, ArrowRedoOutline, ArchiveOutline, SettingsOutline,
  ReturnDownBack, GitMerge, Search,
} from '@vicons/ionicons5'
import SettingsPanel from '../settings/SettingsPanel.vue'
import { useRepoStore } from '../../stores/repo'
import { useBranchesStore } from '../../stores/branches'
import { useCommitsStore } from '../../stores/commits'
import { useRemoteStore } from '../../stores/remote'

const emit = defineEmits(['fetch', 'pull', 'push', 'create-branch', 'stash', 'pop-stash'])

const repo = useRepoStore()
const branches = useBranchesStore()
const commits = useCommitsStore()
const remote = useRemoteStore()
const showSettings = ref(false)

const isSyncing = computed(() => {
  if (!repo.activeRepoPath) return false
  return remote.isSyncing(repo.activeRepoPath)
})

const currentRepoName = computed(() => {
  if (!repo.activeRepoPath) return 'Open Repo'
  return repo.repoName(repo.activeRepoPath)
})

const currentBranchName = computed(() => {
  if (!repo.activeRepoPath) return ''
  return branches.currentBranch(repo.activeRepoPath)
})

const repoList = computed(() => {
  const list: { key: string; label: string }[] = []
  repo.openRepos.forEach((_, path) => {
    list.push({ key: path, label: repo.repoName(path) })
  })
  return list
})

const localBranches = computed(() =>
  (repo.activeRepo?.branches ?? []).filter(b => !b.is_remote),
)

async function handleRepoSwitch(key: string) {
  if (key === '__open__') {
    const selected = await open({ directory: true, multiple: false, title: 'Open Repository' })
    if (!selected) return
    try {
      await repo.openRepo(selected)
      await Promise.all([
        branches.fetchBranches(selected),
        commits.fetchLogs(selected),
      ])
      toast.success(`Opened: ${selected}`)
    } catch (e) {
      toast.error(`Failed to open: ${e}`)
    }
  } else if (key !== '__separator__') {
    repo.switchTab(key)
  }
}

async function switchBranch(name: string) {
  if (!repo.activeRepoPath) return
  await branches.switchBranch(repo.activeRepoPath, name)
}

async function handleRefresh() {
  if (!repo.activeRepoPath) return
  await Promise.all([
    commits.fetchLogs(repo.activeRepoPath),
    branches.fetchBranches(repo.activeRepoPath),
  ])
}
</script>

<style scoped>
.tab-action-bar {
  height: 34px;
  display: flex;
  align-items: center;
  padding: 0 8px;
  background: var(--sidebar);
  border-bottom: 1px solid var(--border);
  gap: 2px;
  flex-shrink: 0;
}

.tab-bar-left {
  display: flex;
  align-items: center;
  gap: 2px;
}

.tab-bar-center {
  display: flex;
  align-items: center;
  gap: 1px;
  margin-left: 8px;
}

.tab-bar-right {
  display: flex;
  align-items: center;
  gap: 1px;
  margin-left: auto;
}

.bar-btn {
  color: var(--sidebar-foreground) !important;
  font-size: 11px !important;
  height: 26px !important;
}

.bar-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.08) !important;
}

.bar-btn:disabled {
  opacity: 0.35 !important;
}

.repo-switch-btn {
  max-width: 160px;
  font-size: 11px !important;
  padding: 0 6px !important;
}

.branch-switch-btn {
  max-width: 140px;
  font-size: 11px !important;
  padding: 0 6px !important;
}

.bar-separator {
  width: 1px;
  height: 16px;
  background: var(--border);
  margin: 0 4px;
  flex-shrink: 0;
}

.ref-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  display: inline-block;
  margin-right: 6px;
  flex-shrink: 0;
}

.dot-current {
  background: var(--primary);
}

.dot-other {
  border: 1.5px solid var(--sidebar-foreground);
  opacity: 0.4;
  background: transparent;
}
</style>
