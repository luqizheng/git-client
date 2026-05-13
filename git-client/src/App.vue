<template>
  <AppLayout>
    <div class="flex-1 flex overflow-hidden">
      <GraphView />
      <DiffView />
      <CommitPanel />
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import AppLayout from './components/layout/AppLayout.vue'
import GraphView from './components/graph/GraphView.vue'
import DiffView from './components/diff/DiffView.vue'
import CommitPanel from './components/commit/CommitPanel.vue'
import { useKeyboard } from './composables/useKeyboard'
import { useRepoStore } from './stores/repo'
import { useBranchesStore } from './stores/branches'
import { useRemoteStore } from './stores/remote'
import { useCommitsStore } from './stores/commits'
import { useAppStore } from './stores/app'

const repo = useRepoStore()
const branches = useBranchesStore()
const remote = useRemoteStore()
const commits = useCommitsStore()
const appStore = useAppStore()

useKeyboard([
  { key: 'l', ctrl: true, handler: () => {
    if (repo.repoPath && branches.currentBranch) {
      remote.pullRemote(repo.repoPath, 'origin', branches.currentBranch)
    }
  }},
  { key: 'p', ctrl: true, shift: true, handler: () => {
    if (repo.repoPath && branches.currentBranch) {
      remote.pushRemote(repo.repoPath, 'origin', branches.currentBranch)
    }
  }},
  { key: 'F5', handler: () => {
    if (repo.repoPath) {
      commits.fetchLogs(repo.repoPath)
      branches.fetchBranches(repo.repoPath)
    }
  }},
])

onMounted(() => {
  appStore.loadSettings()
})
</script>
