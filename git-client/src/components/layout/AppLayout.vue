<template>
  <div class="h-screen flex flex-col bg-gray-900 text-gray-100">
    <Toolbar @open="handleOpen" />
    <RepoTabs @open="handleOpen" />
    <div class="flex flex-1 overflow-hidden">
      <Sidebar />
      <main class="flex-1 flex overflow-hidden">
        <slot />
      </main>
    </div>
    <StatusBar />
  </div>
</template>

<script setup lang="ts">
import Toolbar from './Toolbar.vue'
import RepoTabs from './RepoTabs.vue'
import Sidebar from './Sidebar.vue'
import StatusBar from './StatusBar.vue'
import { open } from '@tauri-apps/plugin-dialog'
import { useRepoStore } from '../../stores/repo'
import { useBranchesStore } from '../../stores/branches'
import { useCommitsStore } from '../../stores/commits'
import { useMessage } from 'naive-ui'

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
</script>
