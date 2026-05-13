<template>
  <div class="h-10 flex items-center px-3 bg-gray-800 border-b border-gray-700 gap-1">
    <n-button quaternary size="small" :loading="repo.loading" @click="$emit('open')">Open</n-button>
    <n-button quaternary size="small" @click="$emit('clone')">Clone</n-button>
    <n-divider vertical />
    <n-button quaternary size="small" @click="$emit('fetch')">Fetch</n-button>
    <n-button quaternary size="small" @click="$emit('pull')">Pull</n-button>
    <n-button quaternary size="small" @click="$emit('push')">Push</n-button>
    <div class="flex-1" />
    <n-button quaternary size="small" @click="toggleTheme">{{ app.theme === 'dark' ? '🌙' : '☀️' }}</n-button>
  </div>
</template>

<script setup lang="ts">
import { NButton, NDivider } from 'naive-ui'
import { useAppStore } from '../../stores/app'
import { useRepoStore } from '../../stores/repo'
import { useTheme } from '../../composables/useTheme'

defineEmits(['open', 'clone', 'fetch', 'pull', 'push'])

const app = useAppStore()
const repo = useRepoStore()
const { toggleTheme } = useTheme()
</script>
