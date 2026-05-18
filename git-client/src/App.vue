<template>
  <AppContent />
</template>

<script setup lang="ts">
import AppContent from './components/layout/AppContent.vue'
import { useRightPanelStore } from './stores/rightPanel'
import { useRepoStore } from './stores/repo'
import { useBranchesStore } from './stores/branches'
import { useRemoteStore } from './stores/remote'
import { useCommitsStore } from './stores/commits'
import { useKeyboard } from './composables/useKeyboard'

const rightPanel = useRightPanelStore()
const repo = useRepoStore()
const branches = useBranchesStore()
const remote = useRemoteStore()
const commits = useCommitsStore()

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
