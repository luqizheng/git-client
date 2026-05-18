<template>
  <div class="toolbar">
    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <Button variant="ghost" size="sm" class="toolbar-btn repo-switch-btn">
          <FolderOpen class="w-4 h-4 mr-1" />
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

    <div class="w-px h-5 bg-border mx-1" />

    <Button variant="ghost" size="icon" class="toolbar-btn h-7 w-7" disabled title="Undo">
      <ArrowUndoOutline class="w-4 h-4" />
    </Button>
    <Button variant="ghost" size="icon" class="toolbar-btn h-7 w-7" disabled title="Redo">
      <ArrowRedoOutline class="w-4 h-4" />
    </Button>

    <div class="w-px h-5 bg-border mx-1" />

    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <Button variant="ghost" size="sm" :disabled="isSyncing" class="toolbar-btn">
          <ArrowDown class="w-4 h-4 mr-1" />
          <ChevronDown class="w-3 h-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem @click="handlePullSelect('fetch-all')">Fetch All</DropdownMenuItem>
        <DropdownMenuItem @click="handlePullSelect('pull-ff')">Pull (fast-forward if possible)</DropdownMenuItem>
        <DropdownMenuItem @click="handlePullSelect('pull-ff-only')">Pull (fast-forward only)</DropdownMenuItem>
        <DropdownMenuItem @click="handlePullSelect('pull-rebase')">Pull (rebase)</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    <Button variant="ghost" size="icon" :disabled="isSyncing" class="toolbar-btn h-7 w-7" title="Push" @click="$emit('push')">
      <ArrowUp class="w-4 h-4" />
    </Button>

    <div class="w-px h-5 bg-border mx-1" />

    <Button variant="ghost" size="icon" class="toolbar-btn h-7 w-7" title="Branch">
      <GitBranch class="w-4 h-4" />
    </Button>
    <Button variant="ghost" size="icon" class="toolbar-btn h-7 w-7" title="Stash">
      <Archive class="w-4 h-4" />
    </Button>
    <Button variant="ghost" size="icon" class="toolbar-btn h-7 w-7" title="Pop Stash">
      <ArchiveOutline class="w-4 h-4" />
    </Button>

    <div class="flex-1" />

    <Button variant="ghost" size="icon" class="toolbar-btn h-7 w-7" :title="app.theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'" @click="toggleTheme">
      <Moon v-if="app.theme === 'dark'" class="w-4 h-4" />
      <Sunny v-else class="w-4 h-4" />
    </Button>
    <Button variant="ghost" size="icon" class="toolbar-btn h-7 w-7" title="Settings" @click="showSettings = true">
      <Settings class="w-4 h-4" />
    </Button>
    <settings-panel v-model="showSettings" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  FolderOpen, ArrowDown, ArrowUp, Moon, Sunny, Settings,
  GitBranch, Archive, ChevronDown,
  ArrowUndoOutline, ArrowRedoOutline, ArchiveOutline,
} from '@vicons/ionicons5'
import { open } from '@tauri-apps/plugin-dialog'
import { useAppStore } from '../../stores/app'
import { useRepoStore } from '../../stores/repo'
import { useBranchesStore } from '../../stores/branches'
import { useRemoteStore } from '../../stores/remote'
import { useTheme } from '../../composables/useTheme'
import SettingsPanel from '../settings/SettingsPanel.vue'

const emit = defineEmits(['open', 'clone', 'fetch', 'pull', 'push'])

const app = useAppStore()
const repo = useRepoStore()
const branches = useBranchesStore()
const remote = useRemoteStore()
const { toggleTheme } = useTheme()
const showSettings = ref(false)

const isSyncing = computed(() => {
  if (!repo.activeRepoPath) return false
  return remote.isSyncing(repo.activeRepoPath)
})

const currentRepoName = computed(() => {
  if (!repo.activeRepoPath) return 'Open Repo'
  return repo.repoName(repo.activeRepoPath)
})

const repoList = computed(() => {
  const repos: { key: string; label: string }[] = []
  repo.openRepos.forEach((_, path) => {
    repos.push({ key: path, label: repo.repoName(path) })
  })
  return repos
})

async function handleRepoSwitch(key: string) {
  if (key === '__open__') {
    const selected = await open({ directory: true, multiple: false, title: 'Open Repository' })
    if (!selected) return
    await repo.openRepo(selected)
    await Promise.all([
      branches.fetchBranches(selected),
    ])
  } else if (key !== '__separator__') {
    repo.switchTab(key)
  }
}

function handlePullSelect(key: string) {
  if (key === 'fetch-all') {
    emit('fetch')
  } else {
    emit('pull')
  }
}
</script>

<style scoped>
.toolbar {
  height: 40px;
  display: flex;
  align-items: center;
  padding: 0 8px;
  background: var(--sidebar);
  border-bottom: 1px solid var(--border);
  gap: 2px;
  flex-shrink: 0;
}

.toolbar-btn {
  color: var(--sidebar-foreground) !important;
}

.toolbar-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.08) !important;
}

.toolbar-btn:disabled {
  opacity: 0.35 !important;
}

.repo-switch-btn {
  max-width: 200px;
  font-size: 12px;
}
</style>
