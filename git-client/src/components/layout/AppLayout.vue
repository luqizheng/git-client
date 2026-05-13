<template>
  <div class="h-screen flex flex-col bg-gray-900 text-gray-100">
    <Toolbar @open="handleOpen" />
    <RepoTabs @open="handleOpen" />
    <div class="main-container flex flex-1 overflow-hidden">
      <Sidebar />
      <ResizeHandle
        v-if="!app.sidebarCollapsed"
        direction="horizontal"
        :min-size="120"
        :max-size="400"
        :get-size="() => app.sidebarWidth"
        @resize="(w: number) => app.sidebarWidth = w"
      />
      <CenterArea>
        <slot />
      </CenterArea>
      <ResizeHandle
        v-if="rightPanel.visible"
        direction="horizontal"
        :min-size="rightPanel.MIN_WIDTH"
        :max-size="rightPanel.MAX_WIDTH"
        :get-size="() => rightPanel.width"
        @resize="(w: number) => rightPanel.setWidth(w)"
      />
      <RightPanel v-show="rightPanel.visible" />
    </div>
    <StatusBar />
  </div>
</template>

<script setup lang="ts">
import Toolbar from './Toolbar.vue'
import RepoTabs from './RepoTabs.vue'
import Sidebar from './Sidebar.vue'
import StatusBar from './StatusBar.vue'
import ResizeHandle from './ResizeHandle.vue'
import CenterArea from './CenterArea.vue'
import RightPanel from './RightPanel.vue'
import { open } from '@tauri-apps/plugin-dialog'
import { useRepoStore } from '../../stores/repo'
import { useBranchesStore } from '../../stores/branches'
import { useCommitsStore } from '../../stores/commits'
import { useAppStore } from '../../stores/app'
import { useRightPanelStore } from '../../stores/rightPanel'
import { useMessage } from 'naive-ui'

const repo = useRepoStore()
const branches = useBranchesStore()
const commits = useCommitsStore()
const app = useAppStore()
const rightPanel = useRightPanelStore()
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
