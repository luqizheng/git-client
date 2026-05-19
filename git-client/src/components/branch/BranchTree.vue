<template>
  <div class="text-xs">
    <div class="flex items-center gap-1 mb-1">
      <button
        class="flex-1 px-2 py-0.5 text-xs rounded transition-colors"
        :class="activeTab === 'local' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'"
        @click="activeTab = 'local'"
      >
        Local
      </button>
      <button
        class="flex-1 px-2 py-0.5 text-xs rounded transition-colors"
        :class="activeTab === 'remote' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'"
        @click="activeTab = 'remote'"
      >
        Remote
      </button>
    </div>

    <div v-if="activeTab === 'local'">
      <div v-for="branch in localBranches" :key="branch.name"
        class="flex items-center px-2 py-0.5 hover:bg-muted cursor-pointer"
        :class="{ 'bg-muted': branch.is_head }"
        @click="onSwitch(branch.name)"
        @contextmenu.prevent="onContext($event, branch)"
      >
        <span class="mr-1" :class="branch.is_head ? 'text-accent-green' : 'text-primary'">
          {{ branch.is_head ? '�? : '�? }}
        </span>
        <span class="text-foreground truncate">{{ branch.name }}</span>
        <span v-if="branch.upstream" class="ml-1 text-muted-foreground">�?{{ branch.upstream }}</span>
      </div>
      <Button size="sm" variant="ghost" class="mt-1 h-6 text-xs" @click="showDialog = true">+ New Branch</Button>
    </div>

    <div v-else>
      <div v-for="branch in remoteBranches" :key="branch.name"
        class="flex items-center px-2 py-0.5 hover:bg-muted cursor-pointer text-muted-foreground"
      >
        <span class="mr-1">�?/span>
        <span class="truncate">{{ branch.name }}</span>
      </div>
    </div>

    <BranchDialog v-model:show="showDialog" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Button } from '@/components/ui/button'
import { toast } from 'vue-sonner'
import { useBranchesStore } from '../../stores/branches'
import { useRepoStore } from '../../stores/repo'
import BranchDialog from './BranchDialog.vue'
import type { Branch } from '../../types/git'

const branchesStore = useBranchesStore()
const repo = useRepoStore()
const showDialog = ref(false)
const activeTab = ref<'local' | 'remote'>('local')

const allBranches = computed(() => repo.activeRepo?.branches ?? [])
const localBranches = computed(() => allBranches.value.filter(b => !b.is_remote))
const remoteBranches = computed(() => allBranches.value.filter(b => b.is_remote))

async function onSwitch(name: string) {
  if (!repo.activeRepoPath) return
  try {
    await branchesStore.switchBranch(repo.activeRepoPath, name)
    toast.success(`Switched to ${name}`)
  } catch (e) {
    toast.error(String(e))
  }
}

function onContext(_e: MouseEvent, _branch: Branch) {
  // future: context menu with delete/merge/rebase
}
</script>
