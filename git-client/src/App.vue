<template>
  <n-config-provider :theme="theme">
    <n-message-provider>
      <AppContent />
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { darkTheme } from 'naive-ui'
import AppContent from './components/layout/AppContent.vue'
import { useAppStore } from './stores/app'
import { useRightPanelStore } from './stores/rightPanel'
import { useRepoStore } from './stores/repo'
import { useBranchesStore } from './stores/branches'
import { useRemoteStore } from './stores/remote'
import { useCommitsStore } from './stores/commits'
import { useKeyboard } from './composables/useKeyboard'

const appStore = useAppStore()
const rightPanel = useRightPanelStore()
const repo = useRepoStore()
const branches = useBranchesStore()
const remote = useRemoteStore()
const commits = useCommitsStore()

const theme = computed(() => appStore.theme === 'dark' ? darkTheme : undefined)

useKeyboard([
  { key: 'l', ctrl: true, handler: () => {
    if (repo.activeRepoPath) {
      const branch = branches.currentBranch(repo.activeRepoPath)
      if (branch) remote.pullRemote(repo.activeRepoPath, 'origin', branch)
    }
  }},
  { key: 'p', ctrl: true, shift: true, handler: () => {
    if (repo.activeRepoPath) {
      const branch = branches.currentBranch(repo.activeRepoPath)
      if (branch) remote.pushRemote(repo.activeRepoPath, 'origin', branch)
    }
  }},
  { key: 'F5', handler: () => {
    if (repo.activeRepoPath) {
      commits.fetchLogs(repo.activeRepoPath)
      branches.fetchBranches(repo.activeRepoPath)
    }
  }},
  { key: 'Escape', handler: () => {
    rightPanel.hidePanel()
  }},
])
</script>
