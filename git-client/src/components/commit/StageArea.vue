<template>
  <div class="text-xs">
    <div class="p-2 border-b border-border">
      <div class="text-muted-foreground mb-1">Staged Changes ({{ stagedFiles.length }})</div>
      <div
        v-for="file in stagedFiles"
        :key="'staged-' + file.path"
        class="flex items-center px-2 py-0.5 hover:bg-muted cursor-pointer"
      >
        <Button size="icon" variant="ghost" class="h-5 w-5" @click.stop="unstage(file.path)">-</Button>
        <span class="ml-1 text-accent-green">{{ statusIcon(file.status) }}</span>
        <span class="ml-1 text-foreground truncate">{{ file.path }}</span>
      </div>
    </div>
    <div class="p-2">
      <div class="text-muted-foreground mb-1">Changes ({{ unstagedFiles.length }})</div>
      <div
        v-for="file in unstagedFiles"
        :key="'unstaged-' + file.path"
        class="flex items-center px-2 py-0.5 hover:bg-muted cursor-pointer"
      >
        <Button size="icon" variant="ghost" class="h-5 w-5" @click.stop="stage(file.path)">+</Button>
        <span class="ml-1 text-accent-yellow">{{ statusIcon(file.status) }}</span>
        <span class="ml-1 text-foreground truncate">{{ file.path }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Button } from '@/components/ui/button'
import { useStagingStore } from '../../stores/staging'
import { useRepoStore } from '../../stores/repo'
import { statusIcon } from '../../utils/diff'

const staging = useStagingStore()
const repo = useRepoStore()

const fileState = computed(() => {
  if (!repo.activeRepoPath) return { staged: [], unstaged: [] }
  return staging.getFileState(repo.activeRepoPath)
})
const stagedFiles = computed(() => fileState.value.staged)
const unstagedFiles = computed(() => fileState.value.unstaged)

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
