<template>
  <Dialog :open="show" @update:open="show = $event">
    <DialogContent class="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>Create Branch</DialogTitle>
      </DialogHeader>
      <div class="grid gap-4 py-4">
        <div class="grid grid-cols-4 items-center gap-4">
          <Label class="text-right">Branch Name</Label>
          <Input v-model="name" placeholder="feature/new-feature" class="col-span-3" />
        </div>
        <div class="flex items-center gap-2 ml-auto">
          <Checkbox v-model:checked="checkout" id="checkout" />
          <Label for="checkout">Checkout after creation</Label>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" @click="show = false">Cancel</Button>
        <Button :disabled="!name.trim()" @click="doCreate">Create</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'vue-sonner'
import { useBranchesStore } from '../../stores/branches'
import { useRepoStore } from '../../stores/repo'

const show = defineModel<boolean>('show', { default: false })
const name = ref('')
const checkout = ref(true)
const branchesStore = useBranchesStore()
const repo = useRepoStore()

async function doCreate() {
  if (!repo.activeRepoPath || !name.value.trim()) return
  const branchName = name.value.trim()
  try {
    await branchesStore.createBranch(repo.activeRepoPath, branchName, checkout.value)
    toast.success(`Branch ${branchName} created`)
    show.value = false
    name.value = ''
  } catch (e) {
    toast.error(String(e))
  }
}
</script>
