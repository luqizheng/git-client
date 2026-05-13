<template>
  <div class="h-screen flex flex-col bg-gray-900 text-gray-100">
    <Toolbar @open="handleOpen" />
    <RepoTabs @open="handleOpen" />
    <div class="main-container flex flex-1 overflow-hidden">
      <n-split
        direction="horizontal"
        :default-size="sidebarDefaultSize"
        :min="0.08"
        :max="0.4"
        :pane1-style="{ 'min-width': sidebarCollapsed ? '40px' : '120px', 'overflow': 'hidden' }"
        :pane2-style="{ 'overflow': 'hidden' }"
      >
        <template #1>
          <Sidebar />
        </template>
        <template #2>
          <n-split
            direction="horizontal"
            :default-size="innerDefaultSize"
            :min="0.04"
            :max="0.8"
            :pane1-style="{ 'overflow': 'hidden' }"
            :pane2-style="{ 'overflow': 'hidden', 'min-width': '40px' }"
          >
            <template #1>
              <CenterArea class="h-full">
                <slot />
              </CenterArea>
            </template>
            <template #2>
              <RightPanel />
            </template>
          </n-split>
        </template>
      </n-split>
    </div>
    <StatusBar />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Toolbar from './Toolbar.vue'
import RepoTabs from './RepoTabs.vue'
import Sidebar from './Sidebar.vue'
import StatusBar from './StatusBar.vue'
import CenterArea from './CenterArea.vue'
import RightPanel from './RightPanel.vue'
import { open } from '@tauri-apps/plugin-dialog'
import { useRepoStore } from '../../stores/repo'
import { useBranchesStore } from '../../stores/branches'
import { useCommitsStore } from '../../stores/commits'
import { useAppStore } from '../../stores/app'
import { useMessage } from 'naive-ui'

const repo = useRepoStore()
const branches = useBranchesStore()
const commits = useCommitsStore()
const app = useAppStore()
const msg = useMessage()

const sidebarCollapsed = ref(false)

watch(() => app.sidebarCollapsed, (v) => { sidebarCollapsed.value = v })

const sidebarDefaultSize = computed(() => {
  if (sidebarCollapsed.value) return 0.04
  const w = app.sidebarWidth || 200
  return Math.min(Math.max(w / 1200, 0.15), 0.35)
})

const innerDefaultSize = computed(() => {
  return 0.6
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
</script>
