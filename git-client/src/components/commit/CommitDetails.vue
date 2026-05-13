<template>
  <div class="flex flex-col h-full overflow-hidden">
    <CommitHeader v-if="detail?.commit" :commit="detail.commit" />
    <div v-else class="p-3 text-gray-500 text-sm">No commit selected</div>
    <ChangedFilesList
      :files="changedFiles"
      :selected-file="selectedFile"
      @select="handleSelectFile"
      class="flex-1 overflow-y-auto"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRightPanelStore } from '../../stores/rightPanel'
import { useDiffStore } from '../../stores/diff'
import { useRepoStore } from '../../stores/repo'
import CommitHeader from './CommitHeader.vue'
import ChangedFilesList from './ChangedFilesList.vue'

const rightPanel = useRightPanelStore()
const diffStore = useDiffStore()
const repo = useRepoStore()

const detail = computed(() => rightPanel.commitDetail)
const changedFiles = computed(() => rightPanel.changedFiles)
const selectedFile = computed(() =>
  repo.activeRepoPath ? diffStore.getSelectedFile(repo.activeRepoPath) : null
)

function handleSelectFile(filePath: string) {
  if (repo.activeRepoPath) {
    diffStore.selectFile(repo.activeRepoPath, filePath)
  }
}

watch(() => rightPanel.selectedCommitSha, async (sha) => {
  if (!sha || !repo.activeRepoPath) return
  await diffStore.fetchCommitDiff(repo.activeRepoPath, sha)
  const diffs = diffStore.getDiffs(repo.activeRepoPath)
  const selectedCommit = repo.activeRepo?.selectedCommit
  if (selectedCommit) {
    rightPanel.setCommitDetail({ commit: selectedCommit, files: diffs })
  }
}, { immediate: true })
</script>
