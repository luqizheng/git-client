<template>
  <div class="status-bar">
    <div class="status-bar-left">
      <span v-if="repo.activeRepo" class="status-branch">
        <n-icon :size="13"><GitBranch /></n-icon>
        {{ branches.currentBranch(repo.activeRepoPath!) || 'detached' }}
      </span>
      <span v-if="repo.activeRepo" class="status-sha">
        <n-icon :size="12"><Code /></n-icon>
        {{ repo.activeRepo.state.head_commit_id?.slice(0, 7) || 'no commits' }}
      </span>
      <span class="status-ahead-behind">
        <span class="ahead"><n-icon :size="12"><ArrowUp /></n-icon>0</span>
        <span class="behind"><n-icon :size="12"><ArrowDown /></n-icon>0</span>
      </span>
    </div>
    <div class="status-bar-center">
      <span v-if="isSyncing" class="status-syncing">
        <n-icon :size="13" class="spin"><Refresh /></n-icon>
        Syncing...
      </span>
    </div>
    <div class="status-bar-right">
      <n-select
        v-model:value="zoomLevel"
        :options="zoomOptions"
        size="tiny"
        class="zoom-select"
        @update:value="handleZoomChange"
      />
      <span v-if="repo.activeRepoPath" class="status-path">
        <n-icon :size="12"><Folder /></n-icon>
        {{ repo.activeRepoPath }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { NIcon, NSelect } from 'naive-ui'
import { GitBranch, Code, Refresh, Folder, ArrowUp, ArrowDown } from '@vicons/ionicons5'
import { useRepoStore } from '../../stores/repo'
import { useBranchesStore } from '../../stores/branches'
import { useRemoteStore } from '../../stores/remote'

const repo = useRepoStore()
const branches = useBranchesStore()
const remote = useRemoteStore()

const zoomLevel = ref('100%')
const zoomOptions = [
  { label: '100%', value: '100%' },
  { label: '110%', value: '110%' },
  { label: '125%', value: '125%' },
  { label: '140%', value: '140%' },
  { label: '150%', value: '150%' },
  { label: '175%', value: '175%' },
  { label: '200%', value: '200%' },
]

const isSyncing = computed(() => {
  if (!repo.activeRepoPath) return false
  return remote.isSyncing(repo.activeRepoPath)
})

function handleZoomChange(val: string) {
  const percent = parseInt(val, 10)
  document.documentElement.style.fontSize = `${(percent / 100) * 16}px`
}
</script>

<style scoped>
.status-bar {
  height: 24px;
  display: flex;
  align-items: center;
  padding: 0 8px;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-color);
  font-size: 11px;
  color: var(--text-secondary);
  user-select: none;
}

.status-bar-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.status-bar-center {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-bar-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.status-branch {
  display: flex;
  align-items: center;
  gap: 3px;
  color: var(--accent-blue);
  font-weight: 500;
}

.status-sha {
  display: flex;
  align-items: center;
  gap: 2px;
  color: var(--text-muted);
}

.status-ahead-behind {
  display: flex;
  align-items: center;
  gap: 4px;
}

.ahead,
.behind {
  display: flex;
  align-items: center;
  gap: 1px;
}

.status-syncing {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--accent-yellow);
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.zoom-select {
  width: 80px;
}

.zoom-select :deep(.n-base-selection) {
  --n-height: 18px !important;
  font-size: 11px;
}

.zoom-select :deep(.n-base-selection-input) {
  font-size: 11px;
}

.status-path {
  display: flex;
  align-items: center;
  gap: 3px;
  color: var(--text-muted);
}
</style>
