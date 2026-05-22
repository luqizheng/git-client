<template>
  <Dialog :open="visible" @update:open="$emit('update:visible', $event)">
    <DialogContent class="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>Create Tag</DialogTitle>
        <DialogDescription>Create a new tag at the specified commit</DialogDescription>
      </DialogHeader>
      <div class="grid gap-4 py-4">
        <div class="grid grid-cols-4 items-center gap-4">
          <Label class="text-right" for="tag-name">Name</Label>
          <Input id="tag-name" v-model="form.name" placeholder="v1.0.0" class="col-span-3" />
        </div>
        <div class="grid grid-cols-4 items-center gap-4">
          <Label class="text-right" for="tag-target">Target</Label>
          <Input id="tag-target" v-model="form.target" class="col-span-3 font-mono text-xs" />
        </div>
        <div class="grid grid-cols-4 items-center gap-4">
          <Label class="text-right" for="tag-message">Message</Label>
          <Textarea id="tag-message" v-model="form.message" placeholder="Optional annotated tag message" class="col-span-3" rows="3" />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" @click="$emit('update:visible', false)">Cancel</Button>
        <Button :disabled="!form.name.trim()" @click="handleCreate">Create Tag</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'vue-sonner'
import { useTagsStore } from '../../stores/tags'

const props = defineProps<{
  visible: boolean
  repoPath: string
  targetSha?: string
}>()
const emit = defineEmits<{ 'update:visible': [boolean]; created: [] }>()

const tagsStore = useTagsStore()

const form = reactive({
  name: '',
  target: '',
  message: '',
})

watch(() => props.visible, (val) => {
  if (val) {
    form.name = ''
    form.target = props.targetSha || 'HEAD'
    form.message = ''
  }
})

watch(() => props.targetSha, (sha) => {
  if (sha) form.target = sha
})

async function handleCreate() {
  if (!props.repoPath || !form.name.trim()) return
  try {
    await tagsStore.createTag(props.repoPath, form.name.trim(), form.target, form.message || undefined)
    toast.success(`Tag ${form.name.trim()} created`)
    form.name = ''
    form.message = ''
    emit('update:visible', false)
    emit('created')
  } catch (e: any) {
    toast.error(String(e))
  }
}
</script>
