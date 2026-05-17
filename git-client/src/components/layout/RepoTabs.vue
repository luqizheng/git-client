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
      <n-icon :size="12" class="text-gray-500"><Folder /></n-icon>
      <span>{{ repo.repoName(path) }}</span>
      <n-icon
        :size="12"
        class="text-gray-500 hover:text-red-400 ml-1 transition-colors"
        @click.stop="repo.closeRepo(path)"
        title="Close Repository"
      >
        <Close />
      </n-icon>
    </div>
    <n-button quaternary size="tiny" class="ml-1" @click="$emit('open')" title="Open Repository">
      <template #icon>
        <n-icon :size="12"><Add /></n-icon>
      </template>
    </n-button>
  </div>
</template>

<script setup lang="ts">
import { NButton, NIcon } from 'naive-ui'
import { Folder, Close, Add } from '@vicons/ionicons5'
import { useRepoStore } from '../../stores/repo'

defineEmits<{ open: [] }>()

const repo = useRepoStore()
</script>