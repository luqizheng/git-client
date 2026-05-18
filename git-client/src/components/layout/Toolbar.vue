<template>
  <div class="h-10 flex items-center px-3 bg-gray-800 border-b border-gray-700 gap-1">
    <n-button quaternary size="small" :loading="repo.loading" @click="$emit('open')" title="Open Repository">
      <template #icon>
        <n-icon :size="14"><FolderOpen /></n-icon>
      </template>
      Open
    </n-button>
    <n-button quaternary size="small" @click="$emit('clone')" title="Clone Repository">
      <template #icon>
        <n-icon :size="14"><Download /></n-icon>
      </template>
      Clone
    </n-button>
    <n-divider vertical />
    <n-button quaternary size="small" :loading="isSyncing" :disabled="isSyncing" @click="$emit('fetch')" title="Fetch from Remote">
      <template #icon>
        <n-icon :size="14"><Refresh /></n-icon>
      </template>
      Fetch
    </n-button>
    <n-button quaternary size="small" :loading="isSyncing" :disabled="isSyncing" @click="$emit('pull')" title="Pull from Remote">
      <template #icon>
        <n-icon :size="14"><ArrowDown /></n-icon>
      </template>
      Pull
    </n-button>
    <n-button quaternary size="small" :loading="isSyncing" :disabled="isSyncing" @click="$emit('push')" title="Push to Remote">
      <template #icon>
        <n-icon :size="14"><ArrowUp /></n-icon>
      </template>
      Push
    </n-button>
    <div class="flex-1" />
    <n-button quaternary size="small" @click="toggleTheme" :title="app.theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'">
      <template #icon>
        <n-icon :size="14">
          <Moon v-if="app.theme === 'dark'" />
          <Sunny v-else />
        </n-icon>
      </template>
      {{ app.theme === 'dark' ? 'Dark' : 'Light' }}
    </n-button>
    <n-divider vertical />
    <n-button quaternary size="small" @click="showSettings = true" title="Settings">
      <template #icon>
        <n-icon :size="14"><Settings /></n-icon>
      </template>
    </n-button>
    <settings-panel v-model="showSettings" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { NButton, NDivider, NIcon } from 'naive-ui'
import { FolderOpen, Download, Refresh, ArrowDown, ArrowUp, Moon, Sunny, Settings } from '@vicons/ionicons5'
import { useAppStore } from '../../stores/app'
import { useRepoStore } from '../../stores/repo'
import { useRemoteStore } from '../../stores/remote'
import { useTheme } from '../../composables/useTheme'
import { computed } from 'vue'
import SettingsPanel from '../settings/SettingsPanel.vue'

defineEmits(['open', 'clone', 'fetch', 'pull', 'push'])

const app = useAppStore()
const repo = useRepoStore()
const remote = useRemoteStore()
const { toggleTheme } = useTheme()
const showSettings = ref(false)

const isSyncing = computed(() => {
  if (!repo.activeRepoPath) return false
  return remote.isSyncing(repo.activeRepoPath)
})
</script>