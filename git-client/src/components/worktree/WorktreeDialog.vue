<template>
  <Dialog :open="showModel" @update:open="showModel = $event">
    <DialogContent class="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>Add Worktree</DialogTitle>
      </DialogHeader>
      <div class="grid gap-4 py-4">
        <div class="grid grid-cols-4 items-center gap-4">
          <Label class="text-right">Path</Label>
          <Input v-model="form.path" placeholder="Enter worktree path" class="col-span-3" />
        </div>
        <div class="grid grid-cols-4 items-center gap-4">
          <Label class="text-right">Branch</Label>
          <Input v-model="form.branch" placeholder="Optional: branch name" class="col-span-3" />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" @click="showModel = false">Cancel</Button>
        <Button :disabled="submitting" @click="handleSubmit">
          <span v-if="submitting" class="mr-2">...</span>
          Add
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useWorktreeStore } from '../../stores/worktree'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'vue-sonner'

const props = defineProps<{
  show: boolean
  repoPath: string
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  'created': []
}>()

const store = useWorktreeStore()
const submitting = ref(false)

const showModel = computed({
  get: () => props.show,
  set: (v) => emit('update:show', v)
})

const form = ref({
  path: '',
  branch: ''
})

async function handleSubmit() {
  if (!form.value.path) {
    toast.error('Please enter worktree path')
    return
  }
  submitting.value = true
  try {
    await store.addWorktree(props.repoPath, form.value.path, form.value.branch || undefined)
    toast.success('Worktree added successfully')
    form.value = { path: '', branch: '' }
    showModel.value = false
    emit('created')
  } catch (e: any) {
    toast.error(`Failed to add worktree: ${e}`)
  } finally {
    submitting.value = false
  }
}
</script>
