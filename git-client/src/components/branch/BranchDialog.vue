<template>
  <n-modal v-model:show="show" preset="dialog" title="Create Branch">
    <n-form>
      <n-form-item label="Branch Name">
        <n-input v-model:value="name" placeholder="feature/new-feature" />
      </n-form-item>
      <n-checkbox v-model:checked="checkout">Checkout after creation</n-checkbox>
    </n-form>
    <template #action>
      <n-button @click="show = false">Cancel</n-button>
      <n-button type="primary" :disabled="!name.trim()" @click="doCreate">Create</n-button>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { NModal, NForm, NFormItem, NInput, NButton, NCheckbox } from 'naive-ui'
import { toast } from 'vue-sonner';
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
