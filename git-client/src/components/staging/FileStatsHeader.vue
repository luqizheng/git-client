<template>
  <div class="file-stats-header px-3 py-2.5 flex items-center justify-between" style="background: #2d2d2d;">
    <span class="text-xs text-gray-400">
      {{ totalChanges }} file changes on <span class="text-green-400 font-medium">{{ branchName }}</span>
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRepoStore } from '../../stores/repo'
import { useBranchesStore } from '../../stores/branches'
import { useRightPanelStore } from '../../stores/rightPanel'

const repo = useRepoStore()
const branches = useBranchesStore()
const rightPanel = useRightPanelStore()

const branchName = computed(() => {
  if (!repo.activeRepoPath) return 'none'
  const branch = branches.currentBranch(repo.activeRepoPath)
  return branch ?? 'detached'
})

const totalChanges = computed(() =>
  rightPanel.unstagedFiles.length + rightPanel.stagedFiles.length
)
</script>
