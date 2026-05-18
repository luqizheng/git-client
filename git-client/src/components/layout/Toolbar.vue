<template>
  <div class="toolbar">
    <n-dropdown :options="repoOptions" @select="handleRepoSwitch" placement="bottom-start">
      <n-button quaternary size="tiny" class="toolbar-btn repo-switch-btn">
        <template #icon>
          <n-icon :size="16"><FolderOpen /></n-icon>
        </template>
        {{ currentRepoName }}
        <n-icon :size="12" class="dropdown-arrow"><ChevronDown /></n-icon>
      </n-button>
    </n-dropdown>

    <n-divider vertical class="toolbar-divider" />

    <n-button quaternary size="tiny" disabled class="toolbar-btn" title="Undo">
      <template #icon>
        <n-icon :size="16"><ArrowUndoOutline /></n-icon>
      </template>
    </n-button>
    <n-button quaternary size="tiny" disabled class="toolbar-btn" title="Redo">
      <template #icon>
        <n-icon :size="16"><ArrowRedoOutline /></n-icon>
      </template>
    </n-button>

    <n-divider vertical class="toolbar-divider" />

    <n-dropdown :options="pullOptions" @select="handlePullSelect" placement="bottom-start">
      <n-button quaternary size="tiny" :loading="isSyncing" :disabled="isSyncing" class="toolbar-btn" title="Pull">
        <template #icon>
          <n-icon :size="16"><ArrowDown /></n-icon>
        </template>
        <n-icon :size="10" class="dropdown-arrow"><ChevronDown /></n-icon>
      </n-button>
    </n-dropdown>
    <n-button quaternary size="tiny" :loading="isSyncing" :disabled="isSyncing" class="toolbar-btn" title="Push" @click="$emit('push')">
      <template #icon>
        <n-icon :size="16"><ArrowUp /></n-icon>
      </template>
    </n-button>

    <n-divider vertical class="toolbar-divider" />

    <n-button quaternary size="tiny" class="toolbar-btn" title="Branch">
      <template #icon>
        <n-icon :size="16"><GitBranch /></n-icon>
      </template>
    </n-button>
    <n-button quaternary size="tiny" class="toolbar-btn" title="Stash">
      <template #icon>
        <n-icon :size="16"><Archive /></n-icon>
      </template>
    </n-button>
    <n-button quaternary size="tiny" class="toolbar-btn" title="Pop Stash">
      <template #icon>
        <n-icon :size="16"><ArchiveOutline /></n-icon>
      </template>
    </n-button>

    <div class="flex-1" />

    <n-button quaternary size="tiny" class="toolbar-btn" :title="app.theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'" @click="toggleTheme">
      <template #icon>
        <n-icon :size="16">
          <Moon v-if="app.theme === 'dark'" />
          <Sunny v-else />
        </n-icon>
      </template>
    </n-button>
    <n-button quaternary size="tiny" class="toolbar-btn" title="Settings" @click="showSettings = true">
      <template #icon>
        <n-icon :size="16"><Settings /></n-icon>
      </template>
    </n-button>
    <settings-panel v-model="showSettings" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { NButton, NDivider, NIcon, NDropdown } from 'naive-ui'
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

const repoOptions = computed(() => {
  const repos: { key: string; label: string }[] = []
  repo.openRepos.forEach((_, path) => {
    repos.push({ key: path, label: repo.repoName(path) })
  })
  if (repos.length > 0) {
    repos.push({ key: '__separator__', label: '───' })
  }
  repos.push({ key: '__open__', label: 'Open Repository...' })
  return repos
})

const pullOptions = [
  { key: 'fetch-all', label: 'Fetch All' },
  { key: 'pull-ff', label: 'Pull (fast-forward if possible)' },
  { key: 'pull-ff-only', label: 'Pull (fast-forward only)' },
  { key: 'pull-rebase', label: 'Pull (rebase)' },
]

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
  background: var(--bg-secondary, #1e1e1e);
  border-bottom: 1px solid var(--border-color, #333);
  gap: 2px;
  flex-shrink: 0;
}

.toolbar-btn {
  color: var(--text-primary, #ccc) !important;
  --n-height: 28px !important;
  --n-padding: 0 6px !important;
}

.toolbar-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.08) !important;
}

.toolbar-btn:disabled {
  opacity: 0.35 !important;
}

.toolbar-divider {
  height: 20px;
  margin: 0 4px;
  border-color: var(--border-color, #444);
}

.repo-switch-btn {
  max-width: 200px;
  font-size: 12px;
}

.dropdown-arrow {
  margin-left: 2px;
  opacity: 0.6;
}
</style>
