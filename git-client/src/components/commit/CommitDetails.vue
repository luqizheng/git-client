<template>
  <div class="commit-details-card">
    <template v-if="detail?.commit">
      <div class="card-header">
        <div class="branch-tags" v-if="branchNames.length > 0">
          <span
            v-for="branch in branchNames"
            :key="branch"
            :class="['branch-tag', isMainBranch(branch) ? 'branch-main' : 'branch-other']"
          >
            <svg class="tag-icon" viewBox="0 0 16 16" fill="currentColor">
              <path d="M11.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5zm-2.25.75a2.25 2.25 0 1 1 3 2.122V6A2.5 2.5 0 0 1 10 8.5H6a1 1 0 0 0-1 1v1.128a2.251 2.251 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.5 0v1.836A2.492 2.492 0 0 1 6 7h4a1 1 0 0 0 1-1v-.628A2.25 2.25 0 0 1 9.5 3.25zM4.25 12a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5zM3.5 3.25a.75.75 0 1 1 1.5 0 .75.75 0 0 1-1.5 0z"/>
            </svg>
            {{ branch }}
          </span>
        </div>
        <h3 class="commit-title">{{ subject }}</h3>
      </div>

      <div class="author-section">
        <div class="avatar" :style="{ background: avatarColor }">
          {{ initials }}
        </div>
        <div class="author-info">
          <div class="author-name">{{ commit!.author }}</div>
          <div class="author-email">{{ commit!.author_email }}</div>
        </div>
        <div class="commit-time">{{ relativeTime }}</div>
      </div>

      <div v-if="body" class="commit-body">
        {{ body }}
      </div>

      <div class="sha-section" @click="copySha">
        <span class="sha-label">SHA</span>
        <span class="sha-value">{{ shortSha }}</span>
        <svg class="copy-icon" viewBox="0 0 16 16" fill="currentColor">
          <path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"/>
          <path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"/>
        </svg>
      </div>

      <div class="divider"></div>

      <div class="files-section">
        <div class="files-header">
          <span class="files-count">{{ changedFiles.length }} changed file{{ changedFiles.length !== 1 ? 's' : '' }}</span>
        </div>
        <ChangedFilesList
          :files="changedFiles"
          :selected-file="selectedFile"
          @select="handleSelectFile"
          class="files-list"
        />
      </div>
    </template>
    <div v-else class="empty-state">
      <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"/>
      </svg>
      <span>Select a commit to view details</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, onUnmounted } from 'vue'
import { useMessage } from 'naive-ui'
import { useRightPanelStore } from '../../stores/rightPanel'
import { useDiffStore } from '../../stores/diff'
import { useRepoStore } from '../../stores/repo'
import ChangedFilesList from './ChangedFilesList.vue'

const rightPanel = useRightPanelStore()
const diffStore = useDiffStore()
const repo = useRepoStore()
const msg = useMessage()

const detail = computed(() => rightPanel.commitDetail)
const commit = computed(() => detail.value?.commit)
const changedFiles = computed(() => rightPanel.changedFiles)
const selectedFile = computed(() =>
  repo.activeRepoPath ? diffStore.getSelectedFile(repo.activeRepoPath) : null
)

const subject = computed(() => {
  if (!commit.value) return ''
  return commit.value.message.split('\n')[0]
})

const body = computed(() => {
  if (!commit.value) return ''
  const lines = commit.value.message.split('\n').slice(1)
  return lines.length > 0 ? lines.join('\n') : ''
})

const shortSha = computed(() => commit.value?.id.slice(0, 7) ?? '')

const initials = computed(() => {
  if (!commit.value?.author) return '?'
  const parts = commit.value.author.split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return commit.value.author.slice(0, 2).toUpperCase()
})

const avatarColor = computed(() => {
  if (!commit.value?.author) return '#6e7681'
  let hash = 0
  for (let i = 0; i < commit.value.author.length; i++) {
    hash = commit.value.author.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash % 360)
  return `hsl(${hue}, 50%, 40%)`
})

const relativeTime = computed(() => {
  if (!commit.value) return ''
  const date = new Date(commit.value.time * 1000)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)
  const diffWeek = Math.floor(diffDay / 7)
  const diffMonth = Math.floor(diffDay / 30)
  const diffYear = Math.floor(diffDay / 365)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`
  if (diffHour < 24) return `${diffHour} hour${diffHour !== 1 ? 's' : ''} ago`
  if (diffDay < 7) return `${diffDay} day${diffDay !== 1 ? 's' : ''} ago`
  if (diffWeek < 4) return `${diffWeek} week${diffWeek !== 1 ? 's' : ''} ago`
  if (diffMonth < 12) return `${diffMonth} month${diffMonth !== 1 ? 's' : ''} ago`
  return `${diffYear} year${diffYear !== 1 ? 's' : ''} ago`
})

const branchNames = computed(() => {
  if (!commit.value?.refs) return []
  return commit.value.refs
    .filter(r => r.ref_type === 'local')
    .map(r => r.name)
})

function isMainBranch(name: string): boolean {
  return /^(main|master|master-main)$/i.test(name)
}

function handleSelectFile(filePath: string) {
  if (repo.activeRepoPath) {
    diffStore.selectFile(repo.activeRepoPath, filePath)
  }
}

async function copySha() {
  if (!commit.value) return
  try {
    await navigator.clipboard.writeText(commit.value.id)
    msg.success(`Copied: ${commit.value.id.slice(0, 7)}`)
  } catch {
    msg.warning('Copy failed')
  }
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null

onUnmounted(() => {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
})

watch(() => rightPanel.selectedCommitSha, (sha) => {
  if (!sha || !repo.activeRepoPath) return
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(async () => {
    await diffStore.fetchCommitDiff(repo.activeRepoPath!, sha)
    const diffs = diffStore.getDiffs(repo.activeRepoPath!)
    const selectedCommit = repo.activeRepo?.selectedCommit
    if (selectedCommit) {
      rightPanel.setCommitDetail({ commit: selectedCommit, files: diffs })
    }
  }, 100)
}, { immediate: true })
</script>

<style scoped>
.commit-details-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #1e1e1e;
  border: 1px solid #3c3c3c;
  border-radius: 8px;
  overflow: hidden;
}

.card-header {
  padding: 16px;
  border-bottom: 1px solid #3c3c3c;
}

.branch-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.branch-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
}

.branch-tag.branch-main {
  background: #238636;
  color: #ffffff;
}

.branch-tag.branch-other {
  background: #1f6feb;
  color: #ffffff;
}

.tag-icon {
  width: 12px;
  height: 12px;
}

.commit-title {
  font-size: 15px;
  font-weight: 600;
  color: #cccccc;
  margin: 0;
  line-height: 1.4;
}

.author-section {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.02);
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  color: #ffffff;
  flex-shrink: 0;
}

.author-info {
  flex: 1;
  min-width: 0;
}

.author-name {
  font-size: 13px;
  font-weight: 500;
  color: #e6e6e6;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.author-email {
  font-size: 11px;
  color: #8b949e;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.commit-time {
  font-size: 11px;
  color: #6e7681;
  white-space: nowrap;
}

.commit-body {
  padding: 12px 16px;
  font-size: 13px;
  color: #8b949e;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  border-bottom: 1px solid #3c3c3c;
}

.sha-section {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  cursor: pointer;
  transition: background 0.15s;
}

.sha-section:hover {
  background: rgba(255, 255, 255, 0.04);
}

.sha-label {
  font-size: 10px;
  font-weight: 600;
  color: #6e7681;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.sha-value {
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 12px;
  color: #58a6ff;
}

.copy-icon {
  width: 14px;
  height: 14px;
  color: #6e7681;
  margin-left: auto;
}

.divider {
  height: 1px;
  background: #3c3c3c;
}

.files-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.files-header {
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.02);
}

.files-count {
  font-size: 11px;
  font-weight: 500;
  color: #8b949e;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.files-list {
  flex: 1;
  overflow-y: auto;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #6e7681;
  font-size: 13px;
}

.empty-icon {
  width: 32px;
  height: 32px;
  opacity: 0.5;
}
</style>
