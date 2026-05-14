<template>
  <div v-if="selectedCommit" class="flex-1 overflow-y-auto p-3">
    <div class="text-xs text-gray-500 uppercase tracking-wide mb-2">Commit Detail</div>
    <div class="flex items-center gap-2 mb-1">
      <span class="font-mono text-blue-400 text-xs">{{ selectedCommit.id.slice(0, 7) }}</span>
      <span
        v-for="(ref, idx) in selectedCommit.refs"
        :key="idx"
        class="text-xs px-1.5 py-0.5 rounded bg-green-900/40 text-green-400"
      >{{ ref.name }}</span>
    </div>
    <div class="text-gray-100 text-sm mb-1">{{ selectedCommit.message.split('\n')[0] }}</div>
    <div v-if="selectedCommit.message.split('\n').length > 1" class="text-gray-400 text-xs mt-1 whitespace-pre-wrap">
      {{ selectedCommit.message.split('\n').slice(1).join('\n') }}
    </div>
    <div class="text-gray-500 text-xs mt-1">
      {{ selectedCommit.author }} &lt;{{ selectedCommit.author_email }}&gt;
    </div>
    <div class="text-gray-500 text-xs">{{ new Date(selectedCommit.time * 1000).toLocaleString() }}</div>

    <div v-if="diffFiles.length > 0" class="mt-3 pt-2 border-t border-gray-700">
      <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">Changed Files</div>
      <div
        v-for="file in diffFiles"
        :key="file.path"
        class="text-xs py-0.5 flex items-center gap-1 cursor-pointer hover:text-blue-400"
        @click="selectDiffFile(file.path)"
      >
        <span class="font-mono w-4" :class="statusColor(file.status)">{{ statusIcon(file.status) }}</span>
        <span class="text-gray-300 truncate">{{ file.path }}</span>
      </div>
    </div>
  </div>
  <div v-else class="flex-1 flex items-center justify-center text-gray-500 text-sm">
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
