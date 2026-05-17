<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useMessage } from 'naive-ui'
import { open } from '@tauri-apps/plugin-dialog'
import AppLayout from './AppLayout.vue'
import RepoPanel from '../repo/RepoPanel.vue'
import CommitList from '../commit/components/commit-list/commit-list.vue'
import CommitFileDiffView from '../commit/CommitFileDiffView.vue'
import { useRepoStore } from '../../stores/repo'
import { useBranchesStore } from '../../stores/branches'
import { useCommitsStore } from '../../stores/commits'
import { useDiffStore } from '../../stores/diff'
import { injectMockData } from '../../mocks/commits'

const repo = useRepoStore()
const branches = useBranchesStore()
const commits = useCommitsStore()
const diffStore = useDiffStore()
const msg = useMessage()

const hasSelectedFile = computed(() => {
  if (!repo.activeRepoPath) return false
  return diffStore.getSelectedFile(repo.activeRepoPath) !== null
})

async function handleOpen() {
  const selected = await open({ directory: true, multiple: false, title: 'Open Repository' })
  if (!selected) return
  try {
    await repo.openRepo(selected)
    await Promise.all([
      branches.fetchBranches(selected),
      commits.fetchLogs(selected),
    ])
    msg.success(`Opened: ${selected}`)
  } catch (e) {
    msg.error(`Failed to open: ${e}`)
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && hasSelectedFile.value) {
    if (repo.activeRepoPath) {
      diffStore.selectFile(repo.activeRepoPath, null)
    }
  }
}

onMounted(() => {
  const params = new URLSearchParams(window.location.search)
  if (params.get('mock') === '1' || !window.__TAURI__) {
    injectMockData()
  }
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

defineExpose({ handleOpen })
</script>

<template>
  <AppLayout>
    <template v-if="repo.activeRepo">
      <CommitFileDiffView v-if="hasSelectedFile" />
      <CommitList v-else />
    </template>
    <template v-else>
      <RepoPanel @open="handleOpen" />
    </template>
  </AppLayout>
</template>
