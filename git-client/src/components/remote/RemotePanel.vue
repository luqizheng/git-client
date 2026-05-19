<template>
  <div class="text-xs">
    <div v-if="progress.isActive" class="px-2 py-1 mb-1 bg-muted rounded">
      <div class="flex items-center justify-between mb-0.5">
        <span class="text-muted-foreground">{{ progress.type === 'fetch' ? 'Fetching' : 'Pushing' }}</span>
        <span class="text-muted-foreground">{{ progress.bytes }}</span>
      </div>
      <div class="h-1 bg-muted rounded overflow-hidden">
        <div
          class="h-full rounded transition-all duration-200"
          :class="progress.type === 'fetch' ? 'bg-primary' : 'bg-accent-green'"
          :style="{ width: `${Math.round(progress.progress)}%` }"
        />
      </div>
      <div class="text-muted-foreground mt-0.5">{{ progress.phase }}</div>
    </div>

    <div v-for="remote in remotes" :key="remote.name"
      class="flex items-center px-2 py-0.5 hover:bg-muted cursor-pointer"
    >
      <span class="text-purple-400 mr-1">�?/span>
      <span class="text-foreground">{{ remote.name }}</span>
      <span class="ml-1 text-muted-foreground truncate">{{ remote.url }}</span>
    </div>
    <div v-if="remotes.length === 0" class="text-muted-foreground px-2 py-0.5">No remotes</div>
    <Button size="sm" variant="ghost" class="mt-1 h-6 text-xs" @click="showAdd = true">+ Add Remote</Button>

    <Dialog :open="showAdd" @update:open="showAdd = $event">
      <DialogContent class="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Remote</DialogTitle>
        </DialogHeader>
        <div class="grid gap-4 py-4">
          <div class="grid grid-cols-4 items-center gap-4">
            <Label class="text-right">Name</Label>
            <Input v-model="remoteName" placeholder="origin" class="col-span-3" />
          </div>
          <div class="grid grid-cols-4 items-center gap-4">
            <Label class="text-right">URL</Label>
            <Input v-model="remoteUrl" placeholder="https://github.com/user/repo.git" class="col-span-3" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="showAdd = false">Cancel</Button>
          <Button @click="doAdd">Add</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'vue-sonner'
import { useRemoteStore } from '../../stores/remote'
import { useRepoStore } from '../../stores/repo'
import { useRemoteProgress } from '../../composables/useRemoteProgress'

const remoteStore = useRemoteStore()
const repo = useRepoStore()
const { progress } = useRemoteProgress()
const showAdd = ref(false)
const remoteName = ref('')
const remoteUrl = ref('')

const remotes = computed(() => repo.activeRepoPath ? remoteStore.getRemotes(repo.activeRepoPath) : [])

async function doAdd() {
  if (!repo.activeRepoPath || !remoteName.value || !remoteUrl.value) return
  try {
    await remoteStore.addRemote(repo.activeRepoPath, remoteName.value, remoteUrl.value)
    showAdd.value = false
    remoteName.value = ''
    remoteUrl.value = ''
  } catch (e) {
    toast.error(String(e))
  }
}

onMounted(() => {
  if (repo.activeRepoPath) remoteStore.fetchRemotes(repo.activeRepoPath)
})
</script>
