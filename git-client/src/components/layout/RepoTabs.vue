<template>
  <div v-if="repo.openRepos.size > 0" class="flex items-center border-b border-gray-700 bg-gray-850 h-[35px] px-2 gap-0.5">
    <div
      v-for="[path] in repo.openRepos"
      :key="path"
      class="flex items-center h-full px-3 cursor-pointer text-xs gap-1.5 transition-colors"
      :class="path === repo.activeRepoPath
        ? 'bg-gray-900 text-gray-100 border-t-2 border-blue-500'
        : 'bg-gray-800 text-gray-400 hover:text-gray-200 border-t-2 border-transparent'"
      :title="path"
      @click="repo.switchTab(path)"
    >
      <span>{{ repo.repoName(path) }}</span>
      <span
        class="text-gray-500 hover:text-red-400 ml-1 leading-none"
        @click.stop="repo.closeRepo(path)"
      >✕</span>
    </div>
    <n-button quaternary size="tiny" class="ml-1" @click="$emit('open')">+</n-button>
  </div>
</template>

<script setup lang="ts">
import { NButton } from 'naive-ui'
import { useRepoStore } from '../../stores/repo'

defineEmits<{ open: [] }>()

const repo = useRepoStore()
</script>
