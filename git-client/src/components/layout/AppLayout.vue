<template>
  <div class="h-screen flex flex-col" style="background: var(--bg-primary); color: var(--text-primary);">
    <RepoTabs />
    <TabActionBar
      @fetch="handleFetch"
      @pull="handlePull"
      @push="handlePush"
      @clone="handleClone"
    />
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
import RepoTabs from './RepoTabs.vue'
import TabActionBar from './TabActionBar.vue'
import Sidebar from './Sidebar.vue'
import StatusBar from './StatusBar.vue'
import CenterArea from './CenterArea.vue'
import RightPanel from './RightPanel.vue'
import CloneDialog from '../repo/CloneDialog.vue'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import { useRepoStore } from '../../stores/repo'
import { useBranchesStore } from '../../stores/branches'
import { useCommitsStore } from '../../stores/commits'
import { useRemoteStore } from '../../stores/remote'

const repo = useRepoStore()
const branches = useBranchesStore()
const commits = useCommitsStore()
const remote = useRemoteStore()

const showCloneDialog = ref(false)

function handleClone() {
  showCloneDialog.value = true
}

async function handleFetch() {
  if (!repo.activeRepoPath) return
  const remotes = remote.getRemotes(repo.activeRepoPath)
  if (remotes.length === 0) return
  try {
    await remote.fetchRemote(repo.activeRepoPath, remotes[0].name)
    await commits.fetchLogs(repo.activeRepoPath)
  } catch (e) {
    console.error('fetch error:', e)
  }
}

async function handlePull() {
  if (!repo.activeRepoPath) return
  const remotes = remote.getRemotes(repo.activeRepoPath)
  if (remotes.length === 0) return
  const currentBranchName = branches.currentBranch(repo.activeRepoPath)
  if (!currentBranchName) return
  try {
    await remote.pullRemote(repo.activeRepoPath, remotes[0].name, currentBranchName)
    await commits.fetchLogs(repo.activeRepoPath)
  } catch (e) {
    console.error('pull error:', e)
  }
}

async function handlePush() {
  if (!repo.activeRepoPath) return
  const remotes = remote.getRemotes(repo.activeRepoPath)
  if (remotes.length === 0) return
  const currentBranchName = branches.currentBranch(repo.activeRepoPath)
  if (!currentBranchName) return
  try {
    await remote.pushRemote(repo.activeRepoPath, remotes[0].name, currentBranchName)
  } catch (e) {
    console.error('push error:', e)
  }
}
</script>
