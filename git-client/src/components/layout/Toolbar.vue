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
    <n-button quaternary size="small" @click="$emit('fetch')" title="Fetch from Remote">
      <template #icon>
        <n-icon :size="14"><Refresh /></n-icon>
      </template>
      Fetch
    </n-button>
    <n-button quaternary size="small" @click="$emit('pull')" title="Pull from Remote">
      <template #icon>
        <n-icon :size="14"><ArrowDown /></n-icon>
      </template>
      Pull
    </n-button>
    <n-button quaternary size="small" @click="$emit('push')" title="Push to Remote">
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
  </div>
</template>

<script setup lang="ts">
import { NButton, NDivider, NIcon } from 'naive-ui'
import { FolderOpen, Download, Refresh, ArrowDown, ArrowUp, Moon, Sunny } from '@vicons/ionicons5'
import { useAppStore } from '../../stores/app'
import { useRepoStore } from '../../stores/repo'
import { useTheme } from '../../composables/useTheme'

defineEmits(['open', 'clone', 'fetch', 'pull', 'push'])

const app = useAppStore()
const repo = useRepoStore()
const { toggleTheme } = useTheme()
</script>