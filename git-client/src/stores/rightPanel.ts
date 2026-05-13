import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Commit, FileDiff } from '../types/git'

export interface CommitDetail {
  commit: Commit
  files: FileDiff[]
}

export type RightPanelMode = 'commit' | 'staging' | null

export const useRightPanelStore = defineStore('rightPanel', () => {
  const visible = ref(false)
  const width = ref(320)
  const isDragging = ref(false)
  const mode = ref<RightPanelMode>(null)

  const selectedCommitSha = ref<string | null>(null)
  const commitDetail = ref<CommitDetail | null>(null)
  const changedFiles = computed(() => commitDetail.value?.files ?? [])

  const unstagedFiles = ref<FileDiff[]>([])
  const stagedFiles = ref<FileDiff[]>([])

  const commitMessage = ref({ summary: '', description: '' })
  const amendMode = ref(false)

  const MIN_WIDTH = 240
  const MAX_WIDTH = 480

  function showPanel(m: 'commit' | 'staging', sha?: string) {
    mode.value = m
    visible.value = true
    if (m === 'commit' && sha) {
      selectedCommitSha.value = sha
    }
  }

  function hidePanel() {
    visible.value = false
    mode.value = null
    selectedCommitSha.value = null
    commitDetail.value = null
  }

  function togglePanel() {
    if (visible.value) {
      hidePanel()
    } else {
      showPanel('staging')
    }
  }

  function setWidth(w: number) {
    width.value = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, w))
  }

  function setCommitDetail(detail: CommitDetail | null) {
    commitDetail.value = detail
  }

  function setStagingData(unstaged: FileDiff[], staged: FileDiff[]) {
    unstagedFiles.value = unstaged
    stagedFiles.value = staged
  }

  return {
    visible, width, isDragging, mode,
    selectedCommitSha, commitDetail, changedFiles,
    unstagedFiles, stagedFiles,
    commitMessage, amendMode,
    MIN_WIDTH, MAX_WIDTH,
    showPanel, hidePanel, togglePanel, setWidth,
    setCommitDetail, setStagingData,
  }
})
