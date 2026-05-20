<template>
  <div class="status-bar">
    <div class="status-bar-left">
      <span v-if="repo.activeRepo" class="status-branch">
        <GitBranch class="w-3.5 h-3.5" />
        {{ branches.currentBranch(repo.activeRepoPath!) || 'detached' }}
      </span>
      <span v-if="repo.activeRepo" class="status-sha">
        <Code class="w-3 h-3" />
        {{ repo.activeRepo.state.head_commit_id?.slice(0, 7) || 'no commits' }}
      </span>
      <span class="status-ahead-behind">
        <span class="ahead"><ArrowUp class="w-3 h-3" />0</span>
        <span class="behind"><ArrowDown class="w-3 h-3" />0</span>
      </span>
    </div>
    <div class="status-bar-center">
      <span v-if="isSyncing" class="status-syncing">
        <Refresh class="w-3.5 h-3.5 spin" />
        Syncing...
      </span>
    </div>
    <div class="status-bar-right">
      <Select v-model="zoomLevel" @update:model-value="handleZoomChange as any">
        <SelectTrigger class="w-20 h-5 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="opt in zoomOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</SelectItem>
        </SelectContent>
      </Select>
      <span v-if="repo.activeRepoPath" class="status-path">
        <Folder class="w-3 h-3" />
        {{ repo.activeRepoPath }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  background: var(--muted);
  border-top: 1px solid var(--border);
  font-size: 11px;
  color: var(--muted-foreground);
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
  color: var(--primary);
  font-weight: 500;
}

.status-sha {
  display: flex;
  align-items: center;
  gap: 2px;
  color: var(--muted-foreground);
  opacity: 0.7;
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
  color: var(--accent);
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.status-path {
  display: flex;
  align-items: center;
  gap: 3px;
  color: var(--muted-foreground);
  opacity: 0.7;
}
</style>
