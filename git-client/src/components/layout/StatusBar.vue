<template>
  <div class="h-6 flex items-center px-3 bg-gray-800 border-t border-gray-700 text-xs text-gray-400 gap-4">
    <span v-if="repo.activeRepo" class="text-blue-400">
      ⑂ {{ branches.currentBranch(repo.activeRepoPath!) || 'detached' }}
    </span>
    <span v-if="repo.activeRepo">
      {{ repo.activeRepo.state.head_commit_id?.slice(0, 7) || 'no commits' }}
    </span>
    <span v-if="isSyncing" class="text-yellow-400">Syncing...</span>
    <div class="flex-1" />
    <span v-if="repo.activeRepoPath">{{ repo.activeRepoPath }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRepoStore } from '../../stores/repo'
import { useBranchesStore } from '../../stores/branches'
import { useRemoteStore } from '../../stores/remote'

const repo = useRepoStore()
const branches = useBranchesStore()
const remote = useRemoteStore()

const isSyncing = computed(() => {
  if (!repo.activeRepoPath) return false
  return remote.isSyncing(repo.activeRepoPath)
})
</script>
