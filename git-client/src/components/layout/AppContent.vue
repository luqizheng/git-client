<script setup lang="ts">
import { onMounted } from 'vue'
import { useMessage } from 'naive-ui'
import { open } from '@tauri-apps/plugin-dialog'
import AppLayout from './AppLayout.vue'
import RepoPanel from '../repo/RepoPanel.vue'
import CommitList from '../commit/components/commit-list/commit-list.vue'
import { useRepoStore } from '../../stores/repo'
import { useBranchesStore } from '../../stores/branches'
import { useCommitsStore } from '../../stores/commits'
import { injectMockData } from '../../mocks/commits'

const repo = useRepoStore()
const branches = useBranchesStore()
const commits = useCommitsStore()
const msg = useMessage()

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

onMounted(() => {
  const params = new URLSearchParams(window.location.search)
  if (params.get('mock') === '1' || !window.__TAURI__) {
    injectMockData()
  }
})

defineExpose({ handleOpen })
</script>

<template>
  <AppLayout>
    <template v-if="repo.activeRepo">
      <CommitList />
    </template>
    <template v-else>
      <RepoPanel @open="handleOpen" />
    </template>
  </AppLayout>
</template>
