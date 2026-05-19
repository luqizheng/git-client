<template>
  <div v-if="selectedCommit" class="flex-1 overflow-y-auto p-3">
    <div class="text-xs text-muted-foreground uppercase tracking-wide mb-2">Commit Detail</div>
    <div class="flex items-center gap-2 mb-1">
      <span class="font-mono text-primary text-xs">{{ selectedCommit.id.slice(0, 7) }}</span>
      <span
        v-for="(ref, idx) in selectedCommit.refs"
        :key="idx"
        class="text-xs px-1.5 py-0.5 rounded bg-accent-green/20 text-accent-green"
      >{{ ref.name }}</span>
    </div>
    <div class="text-foreground text-sm mb-1">{{ selectedCommit.message.split('\n')[0] }}</div>
    <div v-if="selectedCommit.message.split('\n').length > 1" class="text-muted-foreground text-xs mt-1 whitespace-pre-wrap">
      {{ selectedCommit.message.split('\n').slice(1).join('\n') }}
    </div>
    <div class="text-muted-foreground text-xs mt-1">
      {{ selectedCommit.author }} &lt;{{ selectedCommit.author_email }}&gt;
    </div>
    <div class="text-muted-foreground text-xs">{{ new Date(selectedCommit.time * 1000).toLocaleString() }}</div>

    <div v-if="diffFiles.length > 0" class="mt-3 pt-2 border-t border-border">
      <div class="text-xs text-muted-foreground uppercase tracking-wide mb-1">Changed Files</div>
      <div
        v-for="file in diffFiles"
        :key="file.path"
        class="text-xs py-0.5 flex items-center gap-1 cursor-pointer hover:text-primary"
        @click="selectDiffFile(file.path)"
      >
        <span class="font-mono w-4" :class="statusColor(file.status)">{{ statusIcon(file.status) }}</span>
        <span class="text-foreground truncate">{{ file.path }}</span>
      </div>
    </div>
  </div>
  <div v-else class="flex-1 flex items-center justify-center text-muted-foreground text-sm">
    Select a commit to view details
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRepoStore } from '../../stores/repo'
import { useDiffStore } from '../../stores/diff'
import type { FileDiff } from '../../types/git'
import { statusIcon, statusColor } from '../../utils/diff'

const repo = useRepoStore()
const diffStore = useDiffStore()

const selectedCommit = computed(() => repo.activeRepo?.selectedCommit ?? null)

const diffFiles = computed((): FileDiff[] => {
  const path = repo.activeRepoPath
  if (!path) return []
  return diffStore.getDiffs(path)
})

function selectDiffFile(filePath: string) {
  const path = repo.activeRepoPath
  if (path) {
    diffStore.selectFile(path, filePath)
  }
}
</script>
