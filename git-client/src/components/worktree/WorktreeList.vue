<template>
  <div class="worktree-list">
    <div v-if="loading" class="flex items-center justify-center py-4">
      <div class="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
    </div>
    <div v-else-if="worktrees.length === 0" class="text-center py-4 text-muted-foreground text-sm">
       if ($args[0].Value -eq [char]8730) { '√' } elseif ($args[0].Value -eq [char]215) { '×' } elseif ($args[0].Value -eq [char]176) { '°' } else { '?' }  if ($args[0].Value -eq [char]8730) { '√' } elseif ($args[0].Value -eq [char]215) { '×' } elseif ($args[0].Value -eq [char]176) { '°' } else { '?' }  if ($args[0].Value -eq [char]8730) { '√' } elseif ($args[0].Value -eq [char]215) { '×' } elseif ($args[0].Value -eq [char]176) { '°' } else { '?' }  if ($args[0].Value -eq [char]8730) { '√' } elseif ($args[0].Value -eq [char]215) { '×' } elseif ($args[0].Value -eq [char]176) { '°' } else { '?' }  if ($args[0].Value -eq [char]8730) { '√' } elseif ($args[0].Value -eq [char]215) { '×' } elseif ($args[0].Value -eq [char]176) { '°' } else { '?' }  if ($args[0].Value -eq [char]8730) { '√' } elseif ($args[0].Value -eq [char]215) { '×' } elseif ($args[0].Value -eq [char]176) { '°' } else { '?' }  if ($args[0].Value -eq [char]8730) { '√' } elseif ($args[0].Value -eq [char]215) { '×' } elseif ($args[0].Value -eq [char]176) { '°' } else { '?' }  if ($args[0].Value -eq [char]8730) { '√' } elseif ($args[0].Value -eq [char]215) { '×' } elseif ($args[0].Value -eq [char]176) { '°' } else { '?' }  if ($args[0].Value -eq [char]8730) { '√' } elseif ($args[0].Value -eq [char]215) { '×' } elseif ($args[0].Value -eq [char]176) { '°' } else { '?' }  if ($args[0].Value -eq [char]8730) { '√' } elseif ($args[0].Value -eq [char]215) { '×' } elseif ($args[0].Value -eq [char]176) { '°' } else { '?' }  if ($args[0].Value -eq [char]8730) { '√' } elseif ($args[0].Value -eq [char]215) { '×' } elseif ($args[0].Value -eq [char]176) { '°' } else { '?' }  if ($args[0].Value -eq [char]8730) { '√' } elseif ($args[0].Value -eq [char]215) { '×' } elseif ($args[0].Value -eq [char]176) { '°' } else { '?' } 
    </div>
    <div v-else class="text-xs">
      <div
        v-for="wt in worktrees"
        :key="wt.path"
        class="flex items-center px-2 py-0.5 hover:bg-muted cursor-pointer"
        :class="{ 'bg-muted': wt.is_main }"
      >
        <span class="mr-1" :class="wt.is_main ? 'text-accent-green' : 'text-primary'">
          {{ wt.is_main ? ' if ($args[0].Value -eq [char]8730) { '√' } elseif ($args[0].Value -eq [char]215) { '×' } elseif ($args[0].Value -eq [char]176) { '°' } else { '?' }  if ($args[0].Value -eq [char]8730) { '√' } elseif ($args[0].Value -eq [char]215) { '×' } elseif ($args[0].Value -eq [char]176) { '°' } else { '?' } ? : ' if ($args[0].Value -eq [char]8730) { '√' } elseif ($args[0].Value -eq [char]215) { '×' } elseif ($args[0].Value -eq [char]176) { '°' } else { '?' }  if ($args[0].Value -eq [char]8730) { '√' } elseif ($args[0].Value -eq [char]215) { '×' } elseif ($args[0].Value -eq [char]176) { '°' } else { '?' } ? }}
        </span>
        <span class="text-foreground truncate">{{ getWorktreeName(wt.path) }}</span>
        <span v-if="wt.branch" class="ml-1 text-muted-foreground">({{ wt.branch }})</span>
      </div>
    </div>

    <Button size="sm" variant="ghost" class="mt-1 h-6 text-xs" @click="showDialog = true">+ Add Worktree</Button>
    <WorktreeDialog v-model:show="showDialog" :repo-path="repoPath" @created="loadWorktrees" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Button } from '@/components/ui/button'
import { useWorktreeStore } from '../../stores/worktree'
import type { Worktree } from '../../types/git'
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
