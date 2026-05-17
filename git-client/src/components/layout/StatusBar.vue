<template>
  <div class="h-6 flex items-center px-3 bg-gray-800 border-t border-gray-700 text-xs text-gray-400 gap-4">
    <span v-if="repo.activeRepo" class="text-blue-400 flex items-center gap-1">
      <n-icon :size="12"><GitBranch /></n-icon>
      {{ branches.currentBranch(repo.activeRepoPath!) || 'detached' }}
    </span>
    <span v-if="repo.activeRepo">
      <n-icon :size="12" class="inline-block text-gray-500 mr-0.5"><Code /></n-icon>
      {{ repo.activeRepo.state.head_commit_id?.slice(0, 7) || 'no commits' }}
    </span>
    <span v-if="isSyncing" class="text-yellow-400 flex items-center gap-1">
      <n-icon :size="12" class="animate-spin"><Refresh /></n-icon>
      Syncing...
    </span>
    <div class="flex-1" />
    <span v-if="repo.activeRepoPath" class="flex items-center gap-1">
      <n-icon :size="12" class="text-gray-500"><Folder /></n-icon>
      {{ repo.activeRepoPath }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NIcon } from 'naive-ui'
import { GitBranch, Code, Refresh, Folder } from '@vicons/ionicons5'
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