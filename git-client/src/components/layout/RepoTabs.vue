<template>
  <div class="repo-tabs">
    <div
      v-for="path in repoPaths"
      :key="path"
      class="repo-tab"
      :class="{ 'repo-tab-active': path === repo.activeRepoPath }"
      @click="handleSwitch(path)"
    >
      <FolderOpen class="w-3 h-3 flex-shrink-0 opacity-60" />
      <span class="repo-tab-name">{{ repo.repoName(path) }}</span>
      <button
        class="repo-tab-close"
        @click.stop="handleClose(path)"
      >
        <Close class="w-3 h-3" />
      </button>
    </div>
    <button class="repo-tab-add" @click="handleAdd" title="Open Repository">
      <Add class="w-4 h-4" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { open } from '@tauri-apps/plugin-dialog'
import { toast } from 'vue-sonner'
import { FolderOpen, Close, Add } from '@vicons/ionicons5'
import { useRepoStore } from '../../stores/repo'
import { useBranchesStore } from '../../stores/branches'
import { useCommitsStore } from '../../stores/commits'
import { useRemoteStore } from '../../stores/remote'
import { useTagsStore } from '../../stores/tags'
import { useSubmoduleStore } from '../../stores/submodule'

const repo = useRepoStore()
const branches = useBranchesStore()
const commits = useCommitsStore()
const remote = useRemoteStore()
const tagsStore = useTagsStore()
const submoduleStore = useSubmoduleStore()

const repoPaths = computed(() => Array.from(repo.openRepos.keys()))

async function reloadRepoData(path: string) {
  await Promise.all([
    branches.fetchBranches(path),
    commits.fetchLogs(path),
    remote.fetchRemotes(path),
    tagsStore.listTags(path),
    submoduleStore.listSubmodules(path),
  ])
}

function handleSwitch(path: string) {
  if (path === repo.activeRepoPath) return
  repo.switchTab(path)
  reloadRepoData(path)
}

async function handleClose(path: string) {
  await repo.closeRepo(path)
  if (repo.activeRepoPath) {
    reloadRepoData(repo.activeRepoPath)
  }
}

async function handleAdd() {
  const selected = await open({ directory: true, multiple: false, title: 'Open Repository' })
  if (!selected) return
  try {
    await repo.openRepo(selected)
    await reloadRepoData(selected)
    toast.success(`Opened: ${selected}`)
  } catch (e) {
    toast.error(`Failed to open: ${e}`)
  }
}
</script>

<style scoped>
.repo-tabs {
  height: 36px;
  display: flex;
  align-items: stretch;
  background: var(--sidebar);
  border-bottom: 1px solid var(--border);
  padding: 0 4px;
  gap: 2px;
  flex-shrink: 0;
  overflow-x: auto;
  overflow-y: hidden;
}

.repo-tabs::-webkit-scrollbar {
  height: 0;
}

.repo-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  min-width: 0;
  max-width: 180px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  border-radius: 6px 6px 0 0;
  transition: background 0.15s, border-color 0.15s;
  white-space: nowrap;
  position: relative;
  color: var(--muted-foreground);
  font-size: 12px;
}

.repo-tab:hover {
  background: var(--sidebar-accent);
}

.repo-tab-active {
  color: var(--foreground);
  border-bottom-color: var(--primary);
  background: var(--background);
}

.repo-tab-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.repo-tab-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 3px;
  flex-shrink: 0;
  border: none;
  background: transparent;
  color: var(--muted-foreground);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.repo-tab-close:hover {
  background: var(--destructive);
  color: var(--destructive-foreground);
}

.repo-tab-add {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  margin: auto 2px;
  border-radius: 4px;
  border: none;
  background: transparent;
  color: var(--muted-foreground);
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s, color 0.15s;
}

.repo-tab-add:hover {
  background: var(--sidebar-accent);
  color: var(--foreground);
}
</style>
