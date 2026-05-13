<template>
  <div class="text-xs">
    <div v-for="branch in localBranches" :key="branch.name"
      class="flex items-center px-2 py-0.5 hover:bg-gray-700 cursor-pointer"
      :class="{ 'bg-gray-700': branch.is_head }"
      @click="onSwitch(branch.name)"
      @contextmenu.prevent="onContext($event, branch)"
    >
      <span class="mr-1" :class="branch.is_head ? 'text-green-400' : 'text-blue-400'">
        {{ branch.is_head ? '●' : '○' }}
      </span>
      <span class="text-gray-300 truncate">{{ branch.name }}</span>
      <span v-if="branch.upstream" class="ml-1 text-gray-600">→ {{ branch.upstream }}</span>
    </div>
    <div v-for="branch in remoteBranches" :key="branch.name"
      class="flex items-center px-2 py-0.5 hover:bg-gray-700 cursor-pointer text-gray-500"
    >
      <span class="mr-1">◇</span>
      <span class="truncate">{{ branch.name }}</span>
    </div>
    <n-button size="tiny" quaternary class="mt-1" @click="showDialog = true">+ New Branch</n-button>
    <BranchDialog v-model:show="showDialog" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { NButton, useMessage } from 'naive-ui'
import { useBranchesStore } from '../../stores/branches'
import { useRepoStore } from '../../stores/repo'
import BranchDialog from './BranchDialog.vue'
import type { Branch } from '../../types/git'

const branchesStore = useBranchesStore()
const repo = useRepoStore()
const msgApi = useMessage()
const showDialog = ref(false)

const localBranches = computed(() => branchesStore.branches.filter(b => !b.is_remote))
const remoteBranches = computed(() => branchesStore.branches.filter(b => b.is_remote))

async function onSwitch(name: string) {
  if (!repo.repoPath) return
  try {
    await branchesStore.switchBranch(repo.repoPath, name)
    msgApi.success(`Switched to ${name}`)
  } catch (e) {
    msgApi.error(String(e))
  }
}

function onContext(_e: MouseEvent, _branch: Branch) {
  // future: context menu with delete/merge/rebase
}
</script>
