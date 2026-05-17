<template>
  <div class="worktree-list">
    <n-spin :show="loading">
      <n-empty v-if="!loading && worktrees.length === 0" description="无工作树" />
      <div v-else class="text-xs">
        <div
          v-for="wt in worktrees"
          :key="wt.path"
          class="flex items-center px-2 py-0.5 hover:bg-gray-700 cursor-pointer"
          :class="{ 'bg-gray-700': wt.is_main }"
        >
          <span class="mr-1" :class="wt.is_main ? 'text-green-400' : 'text-blue-400'">
            {{ wt.is_main ? '●' : '○' }}
          </span>
          <span class="text-gray-300 truncate">{{ getWorktreeName(wt.path) }}</span>
          <span v-if="wt.branch" class="ml-1 text-gray-600">({{ wt.branch }})</span>
        </div>
      </div>
    </n-spin>

    <n-button size="tiny" quaternary class="mt-1" @click="showDialog = true">+ Add Worktree</n-button>
    <WorktreeDialog v-model:show="showDialog" :repo-path="repoPath" @created="loadWorktrees" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useWorktreeStore } from '../../stores/worktree'
import type { Worktree } from '../../types/git'
import { NButton, NSpin, NEmpty } from 'naive-ui'
import WorktreeDialog from './WorktreeDialog.vue'

const props = defineProps<{ repoPath: string }>()
const store = useWorktreeStore()
const loading = ref(false)
const showDialog = ref(false)

const worktrees = ref<Worktree[]>([])

function getWorktreeName(path: string) {
  return path.split(/[\\/]/).pop() || path
}

async function loadWorktrees() {
  loading.value = true
  try {
    worktrees.value = await store.listWorktrees(props.repoPath)
  } finally {
    loading.value = false
  }
}

onMounted(loadWorktrees)
</script>
