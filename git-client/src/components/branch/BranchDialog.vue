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
import { NModal, NForm, NFormItem, NInput, NButton, NCheckbox, useMessage } from 'naive-ui'
import { useBranchesStore } from '../../stores/branches'
import { useRepoStore } from '../../stores/repo'

const show = defineModel<boolean>('show', { default: false })
const name = ref('')
const checkout = ref(true)
const branchesStore = useBranchesStore()
const repo = useRepoStore()
const msgApi = useMessage()

async function doCreate() {
  if (!repo.repoPath || !name.value.trim()) return
  try {
    await branchesStore.createBranch(repo.repoPath, name.value, checkout.value)
    show.value = false
    name.value = ''
    msgApi.success(`Branch ${name.value} created`)
  } catch (e) {
    msgApi.error(String(e))
  }
}
</script>
