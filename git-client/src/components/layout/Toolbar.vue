<template>
  <div class="h-10 flex items-center px-3 bg-gray-800 border-b border-gray-700 gap-1">
    <n-button quaternary size="small" :loading="repo.loading" @click="handleOpen">Open</n-button>
    <n-button quaternary size="small" @click="$emit('clone-repo')">Clone</n-button>
    <n-divider vertical />
    <n-button quaternary size="small" @click="$emit('fetch')">Fetch</n-button>
    <n-button quaternary size="small" @click="$emit('pull')">Pull</n-button>
    <n-button quaternary size="small" @click="$emit('push')">Push</n-button>
    <div class="flex-1" />
    <n-button quaternary size="small" @click="toggleTheme">{{ app.theme === 'dark' ? '🌙' : '☀️' }}</n-button>
  </div>
</template>

<script setup lang="ts">
import { NButton, NDivider, useMessage } from 'naive-ui'
import { open } from '@tauri-apps/plugin-dialog'
import { useAppStore } from '../../stores/app'
import { useRepoStore } from '../../stores/repo'
import { useBranchesStore } from '../../stores/branches'
import { useCommitsStore } from '../../stores/commits'
import { useTheme } from '../../composables/useTheme'

defineEmits(['clone-repo', 'fetch', 'pull', 'push'])

const app = useAppStore()
const repo = useRepoStore()
const branches = useBranchesStore()
const commits = useCommitsStore()
const msg = useMessage()
const { toggleTheme } = useTheme()

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
