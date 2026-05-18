<template>
  <div class="h-screen flex flex-col bg-gray-900 text-gray-100">
    <Toolbar @open="handleOpen" @fetch="handleFetch" @pull="handlePull" @push="handlePush" />
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
import { computed } from 'vue'
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
import { useRemoteStore } from '../../stores/remote'
import { useMessage } from 'naive-ui'

const repo = useRepoStore()
const branches = useBranchesStore()
const commits = useCommitsStore()
const app = useAppStore()
const remote = useRemoteStore()
const msg = useMessage()

const sidebarCollapsed = computed(() => app.sidebarCollapsed)

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

async function handleFetch() {
  if (!repo.activeRepoPath) {
    msg.warning('No repository open')
    return
  }
  const remotes = remote.getRemotes(repo.activeRepoPath)
  if (remotes.length === 0) {
    msg.warning('No remote configured')
    return
  }
  try {
    await remote.fetchRemote(repo.activeRepoPath, remotes[0].name)
    msg.success('Fetch completed')
    await commits.fetchLogs(repo.activeRepoPath)
  } catch (e) {
    msg.error(`Fetch failed: ${e}`)
  }
}

async function handlePull() {
  if (!repo.activeRepoPath) {
    msg.warning('No repository open')
    return
  }
  const remotes = remote.getRemotes(repo.activeRepoPath)
  if (remotes.length === 0) {
    msg.warning('No remote configured')
    return
  }
  const currentBranchName = branches.currentBranch(repo.activeRepoPath)
  if (!currentBranchName) {
    msg.warning('No branch selected')
    return
  }
  try {
    await remote.pullRemote(repo.activeRepoPath, remotes[0].name, currentBranchName)
    msg.success('Pull completed')
    await commits.fetchLogs(repo.activeRepoPath)
  } catch (e) {
    msg.error(`Pull failed: ${e}`)
  }
}

async function handlePush() {
  if (!repo.activeRepoPath) {
    msg.warning('No repository open')
    return
  }
  const remotes = remote.getRemotes(repo.activeRepoPath)
  if (remotes.length === 0) {
    msg.warning('No remote configured')
    return
  }
  const currentBranchName = branches.currentBranch(repo.activeRepoPath)
  if (!currentBranchName) {
    msg.warning('No branch selected')
    return
  }
  try {
    await remote.pushRemote(repo.activeRepoPath, remotes[0].name, currentBranchName)
    msg.success('Push completed')
  } catch (e) {
    msg.error(`Push failed: ${e}`)
  }
}
</script>
