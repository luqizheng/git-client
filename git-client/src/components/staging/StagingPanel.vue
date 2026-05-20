<template>
  <div class="flex flex-col h-full overflow-hidden">
    <div class="flex-1 overflow-y-auto">
      <UnstagedFilesSection
        :files="rightPanel.unstagedFiles"
        @stage="handleStage"
        @stage-all="handleStageAll"
        @select-file="(path: string) => rightPanel.mode && handleSelectFile(path)"
        @discard-file="handleDiscard"
        @discard-all="handleDiscardAll"
      />
      <StagedFilesSection
        :files="rightPanel.stagedFiles"
        @unstage="handleUnstage"
        @unstage-all="handleUnstageAll"
        @select-file="(path: string) => rightPanel.mode && handleSelectFile(path)"
      />
    </div>
    <CommitEditorSection
      :summary="rightPanel.commitMessage.summary"
      :description="rightPanel.commitMessage.description"
      :amend="rightPanel.amendMode"
      :has-staged-files="rightPanel.stagedFiles.length > 0"
      @commit="handleCommit"
      @update:summary="(v: string) => rightPanel.commitMessage.summary = v"
      @update:description="(v: string) => rightPanel.commitMessage.description = v"
      @update:amend="(v: boolean) => rightPanel.amendMode = v"
    />
  </div>
</template>

<script setup lang="ts">
import { watch, onMounted } from 'vue'
import { useRightPanelStore } from '../../stores/rightPanel'
import { useStagingStore } from '../../stores/staging'
import { useRepoStore } from '../../stores/repo'
import { useCommitsStore } from '../../stores/commits'
import { useDiffStore } from '../../stores/diff'
import { toast } from 'vue-sonner'
import { invoke } from '../../utils/ipc'
import UnstagedFilesSection from './UnstagedFilesSection.vue'
import StagedFilesSection from './StagedFilesSection.vue'
import CommitEditorSection from './CommitEditorSection.vue'

const rightPanel = useRightPanelStore()
const staging = useStagingStore()
const repo = useRepoStore()
const commits = useCommitsStore()
const diffStore = useDiffStore()

onMounted(async () => {
  await refreshStaging()
})

watch(() => rightPanel.visible, async (v) => {
  if (v && rightPanel.mode === 'staging') {
    await refreshStaging()
  }
})

async function refreshStaging() {
  if (!repo.activeRepoPath) return
  await staging.refresh(repo.activeRepoPath)
  const state = staging.getFileState(repo.activeRepoPath)
  rightPanel.setStagingData(state.unstaged, state.staged)
}

async function handleStage(path: string) {
  if (!repo.activeRepoPath) return
  await staging.stageFiles(repo.activeRepoPath, [path])
  await refreshStaging()
}

async function handleStageAll() {
  if (!repo.activeRepoPath) return
  const paths = rightPanel.unstagedFiles.map(f => f.path)
  if (paths.length === 0) return
  await staging.stageFiles(repo.activeRepoPath, paths)
  await refreshStaging()
}

async function handleUnstage(path: string) {
  if (!repo.activeRepoPath) return
  await staging.unstageFiles(repo.activeRepoPath, [path])
  await refreshStaging()
}

async function handleUnstageAll() {
  if (!repo.activeRepoPath) return
  const paths = rightPanel.stagedFiles.map(f => f.path)
  if (paths.length === 0) return
  await staging.unstageFiles(repo.activeRepoPath, paths)
  await refreshStaging()
}

async function handleDiscard(path: string) {
  if (!repo.activeRepoPath) return
  try {
    await invoke<void>('discard_file', { repoPath: repo.activeRepoPath, filePath: path })
    toast.success(`Discarded: ${path}`)
    await refreshStaging()
  } catch (e) {
    toast.error(`Discard failed: ${e}`)
  }
}

async function handleDiscardAll() {
  if (!repo.activeRepoPath) return
  try {
    await invoke<void>('discard_all', { repoPath: repo.activeRepoPath })
    toast.success('All changes discarded')
    await refreshStaging()
  } catch (e) {
    toast.error(`Discard all failed: ${e}`)
  }
}

function handleSelectFile(path: string) {
  if (!repo.activeRepoPath) return
  diffStore.selectFile(repo.activeRepoPath, path)
}

async function handleCommit() {
  if (!repo.activeRepoPath) return
  const { summary, description } = rightPanel.commitMessage
  if (!summary.trim()) {
    toast.warning('Please enter a commit summary')
    return
  }
  try {
    await invoke('commit', {
      repoPath: repo.activeRepoPath,
      message: description.trim() ? `${summary}\n\n${description}` : summary,
      amend: rightPanel.amendMode,
      gpgSign: false,
    })
    rightPanel.commitMessage = { summary: '', description: '' }
    toast.success('Committed successfully')
    await commits.fetchLogs(repo.activeRepoPath)
    await refreshStaging()
  } catch (e) {
    toast.error(String(e))
  }
}
</script>
