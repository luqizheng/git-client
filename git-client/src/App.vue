<template>
  <n-config-provider :theme="theme">
    <n-message-provider>
      <AppLayout>
        <CommitList />
        <div class="flex-1 flex flex-col overflow-hidden">
          <CommitDetailPanel />
          <div class="border-t border-gray-700 flex-shrink-0" style="height: 200px;">
            <div class="h-full flex flex-col">
              <StageArea class="flex-1 overflow-y-auto" />
              <CommitEditor />
            </div>
          </div>
        </div>
      </AppLayout>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { darkTheme } from 'naive-ui'
import AppLayout from './components/layout/AppLayout.vue'
import CommitList from './components/commit/CommitList.vue'
import CommitDetailPanel from './components/commit/CommitDetailPanel.vue'
import StageArea from './components/commit/StageArea.vue'
import CommitEditor from './components/commit/CommitEditor.vue'
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
])

onMounted(async () => {
  try {
    await appStore.loadSettings()
  } catch (e) {
    console.warn('loadSettings error:', e)
  }
})
</script>
