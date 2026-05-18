<template>
  <Dialog v-model:open="show">
    <DialogContent class="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>Clone Repository</DialogTitle>
      </DialogHeader>
      <div class="grid gap-4 py-4">
        <div class="grid gap-2">
          <Label for="url">URL</Label>
          <Input
            id="url"
            v-model="url"
            placeholder="https://github.com/user/repo.git"
          />
        </div>
        <div class="grid gap-2">
          <Label for="path">Local Path</Label>
          <Input
            id="path"
            v-model="path"
            placeholder="/path/to/clone"
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" @click="show = false">Cancel</Button>
        <Button :disabled="loading" @click="doClone">
          <span v-if="loading">Cloning...</span>
          <span v-else>Clone</span>
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRepoStore } from '../../stores/repo'
import { useToast } from '../../composables/useToast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'

const show = defineModel<boolean>('show', { default: false })
const url = ref('')
const path = ref('')
const loading = ref(false)
const repo = useRepoStore()
const { success, error } = useToast()

async function doClone() {
  if (!url.value || !path.value) return
  loading.value = true
  try {
    await repo.cloneRepo(url.value, path.value)
    show.value = false
    success('Clone successful')
  } catch (e) {
    error(String(e))
  } finally {
    loading.value = false
  }
}
</script>
