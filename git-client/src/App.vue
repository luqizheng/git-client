<template>
  <n-config-provider :theme="theme">
    <n-message-provider>
      <AppLayout>
        <CommitList />
      </AppLayout>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { darkTheme } from 'naive-ui'
import AppLayout from './components/layout/AppLayout.vue'
import CommitList from './components/commit/CommitList.vue'
import { useKeyboard } from './composables/useKeyboard'
import { useRepoStore } from './stores/repo'
import { useBranchesStore } from './stores/branches'
import { useRemoteStore } from './stores/remote'
import { useCommitsStore } from './stores/commits'
import { useAppStore } from './stores/app'
import { useRightPanelStore } from './stores/rightPanel'
import { injectMockData } from './mocks/commits'

const repo = useRepoStore()
const branches = useBranchesStore()
const remote = useRemoteStore()
const commits = useCommitsStore()
const appStore = useAppStore()
const rightPanel = useRightPanelStore()

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

onMounted(async () => {
  try {
    await appStore.loadSettings()
  } catch (e) {
    console.warn('loadSettings error:', e)
  }

  const params = new URLSearchParams(window.location.search)
  if (params.get('mock') === '1' || !window.__TAURI__) {
    injectMockData()
  }
})
</script>
