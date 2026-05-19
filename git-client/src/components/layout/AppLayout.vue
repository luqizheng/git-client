<template>
  <div class="h-screen flex flex-col" style="background: var(--bg-primary); color: var(--text-primary);">
    <Toolbar @open="handleOpen" @fetch="handleFetch" @pull="handlePull" @push="handlePush" @clone="handleClone" />
    <RepoTabs />
    <div class="main-container flex flex-1 overflow-hidden">
      <ResizablePanelGroup direction="horizontal" class="w-full h-full">
        <ResizablePanel :default-size="15" :min-size="8" :max-size="35">
          <Sidebar />
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel>
          <ResizablePanelGroup direction="horizontal" class="w-full h-full">
            <ResizablePanel :default-size="60">
              <CenterArea class="h-full">
                <slot />
              </CenterArea>
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel :default-size="40">
              <RightPanel />
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
    <StatusBar />
    <CloneDialog v-model:show="showCloneDialog" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Toolbar from './Toolbar.vue'
import RepoTabs from './RepoTabs.vue'
import Sidebar from './Sidebar.vue'
import StatusBar from './StatusBar.vue'
import CenterArea from './CenterArea.vue'
import RightPanel from './RightPanel.vue'
import CloneDialog from '../repo/CloneDialog.vue'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import { open } from '@tauri-apps/plugin-dialog'
import { useRepoStore } from '../../stores/repo'
import { useBranchesStore } from '../../stores/branches'
import { useCommitsStore } from '../../stores/commits'
import { useRemoteStore } from '../../stores/remote'
import { toast } from 'vue-sonner'

const repo = useRepoStore()
const branches = useBranchesStore()
const commits = useCommitsStore()
const remote = useRemoteStore()

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
    toast.success(`Opened: ${selected}`)
  } catch (e) {
    toast.error(`Failed to open: ${e}`)
  }
}

function handleClone() {
  showCloneDialog.value = true
}

async function handleFetch() {
  if (!repo.activeRepoPath) {
    toast.warning('No repository open')
    return
  }
  const remotes = remote.getRemotes(repo.activeRepoPath)
  if (remotes.length === 0) {
    toast.warning('No remote configured')
    return
  }
  try {
    await remote.fetchRemote(repo.activeRepoPath, remotes[0].name)
    toast.success('Fetch completed')
    await commits.fetchLogs(repo.activeRepoPath)
  } catch (e) {
    toast.error(`Fetch failed: ${e}`)
  }
}

async function handlePull() {
  if (!repo.activeRepoPath) {
    toast.warning('No repository open')
    return
  }
  const remotes = remote.getRemotes(repo.activeRepoPath)
  if (remotes.length === 0) {
    toast.warning('No remote configured')
    return
  }
  const currentBranchName = branches.currentBranch(repo.activeRepoPath)
  if (!currentBranchName) {
    toast.warning('No branch selected')
    return
  }
  try {
    await remote.pullRemote(repo.activeRepoPath, remotes[0].name, currentBranchName)
    toast.success('Pull completed')
    await commits.fetchLogs(repo.activeRepoPath)
  } catch (e) {
    toast.error(`Pull failed: ${e}`)
  }
}

async function handlePush() {
  if (!repo.activeRepoPath) {
    toast.warning('No repository open')
    return
  }
  const remotes = remote.getRemotes(repo.activeRepoPath)
  if (remotes.length === 0) {
    toast.warning('No remote configured')
    return
  }
  const currentBranchName = branches.currentBranch(repo.activeRepoPath)
  if (!currentBranchName) {
    toast.warning('No branch selected')
    return
  }
  try {
    await remote.pushRemote(repo.activeRepoPath, remotes[0].name, currentBranchName)
    toast.success('Push completed')
  } catch (e) {
    toast.error(`Push failed: ${e}`)
  }
}
</script>
