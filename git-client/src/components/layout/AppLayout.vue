<template>
  <div class="h-screen flex flex-col" style="background: var(--bg-primary); color: var(--text-primary);">
    <Toolbar @open="handleOpen" @fetch="handleFetch" @pull="handlePull" @push="handlePush" @clone="handleClone" />
    <div class="main-container flex flex-1 overflow-hidden">
      <n-split direction="horizontal" :default-size="0.15" :min="0.08" :max="0.35">
        <template #1>
          <Sidebar />
        </template>
        <template #2>
          <n-split direction="horizontal" :default-size="0.55" :min="0.2" :max="0.85">
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
    <CloneDialog v-model:show="showCloneDialog" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Toolbar from './Toolbar.vue'
import Sidebar from './Sidebar.vue'
import StatusBar from './StatusBar.vue'
import CenterArea from './CenterArea.vue'
import RightPanel from './RightPanel.vue'
import CloneDialog from '../repo/CloneDialog.vue'
import { open } from '@tauri-apps/plugin-dialog'
import { useRepoStore } from '../../stores/repo'
import { useBranchesStore } from '../../stores/branches'
import { useCommitsStore } from '../../stores/commits'
import { useRemoteStore } from '../../stores/remote'
import { useMessage } from 'naive-ui'

const repo = useRepoStore()
const branches = useBranchesStore()
const commits = useCommitsStore()
const remote = useRemoteStore()
const msg = useMessage()

const showCloneDialog = ref(false)

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

function handleClone() {
  showCloneDialog.value = true
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
