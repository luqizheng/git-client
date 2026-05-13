<template>
  <div class="text-xs">
    <div class="p-2 border-b border-gray-700">
      <div class="text-gray-400 mb-1">Staged Changes ({{ stagedFiles.length }})</div>
      <div
        v-for="file in stagedFiles"
        :key="'staged-' + file.path"
        class="flex items-center px-2 py-0.5 hover:bg-gray-700 cursor-pointer"
      >
        <n-button size="tiny" quaternary @click.stop="unstage(file.path)">−</n-button>
        <span class="ml-1 text-green-400">{{ statusIcon(file.status) }}</span>
        <span class="ml-1 text-gray-300 truncate">{{ file.path }}</span>
      </div>
    </div>
    <div class="p-2">
      <div class="text-gray-400 mb-1">Changes ({{ unstagedFiles.length }})</div>
      <div
        v-for="file in unstagedFiles"
        :key="'unstaged-' + file.path"
        class="flex items-center px-2 py-0.5 hover:bg-gray-700 cursor-pointer"
      >
        <n-button size="tiny" quaternary @click.stop="stage(file.path)">+</n-button>
        <span class="ml-1 text-yellow-400">{{ statusIcon(file.status) }}</span>
        <span class="ml-1 text-gray-300 truncate">{{ file.path }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NButton } from 'naive-ui'
import { useStagingStore } from '../../stores/staging'
import { useRepoStore } from '../../stores/repo'
import type { DiffStatus } from '../../types/git'

const staging = useStagingStore()
const repo = useRepoStore()

const fileState = computed(() => {
  if (!repo.activeRepoPath) return { staged: [], unstaged: [] }
  return staging.getFileState(repo.activeRepoPath)
})
const stagedFiles = computed(() => fileState.value.staged)
const unstagedFiles = computed(() => fileState.value.unstaged)

function statusIcon(status: DiffStatus): string {
  switch (status) {
    case 'Added': return 'A'
    case 'Modified': return 'M'
    case 'Deleted': return 'D'
    case 'Renamed': return 'R'
    case 'Copied': return 'C'
  }
}

async function stage(path: string) {
  if (!repo.activeRepoPath) return
  await staging.stageFiles(repo.activeRepoPath, [path])
  await staging.refresh(repo.activeRepoPath)
}

async function unstage(path: string) {
  if (!repo.activeRepoPath) return
  await staging.unstageFiles(repo.activeRepoPath, [path])
  await staging.refresh(repo.activeRepoPath)
}
</script>
