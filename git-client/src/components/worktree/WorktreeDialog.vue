<template>
  <n-modal
    v-model:show="showModel"
    title="Add Worktree"
    preset="card"
    style="width: 400px"
    :mask-closable="false"
  >
    <n-form :model="form" label-placement="left" label-width="80">
      <n-form-item label="Path">
        <n-input v-model:value="form.path" placeholder="Enter worktree path" />
      </n-form-item>
      <n-form-item label="Branch">
        <n-input v-model:value="form.branch" placeholder="Optional: branch name" />
      </n-form-item>
    </n-form>
    <template #footer>
      <n-space justify="end">
        <n-button @click="showModel = false">Cancel</n-button>
        <n-button type="primary" @click="handleSubmit" :loading="submitting">Add</n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useWorktreeStore } from '../../stores/worktree'
import { NModal, NForm, NFormItem, NInput, NButton, NSpace, useMessage } from 'naive-ui'

const props = defineProps<{
  show: boolean
  repoPath: string
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  'created': []
}>()

const store = useWorktreeStore()
const message = useMessage()
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
    message.error('Please enter worktree path')
    return
  }
  submitting.value = true
  try {
    await store.addWorktree(props.repoPath, form.value.path, form.value.branch || undefined)
    message.success('Worktree added successfully')
    form.value = { path: '', branch: '' }
    showModel.value = false
    emit('created')
  } catch (e: any) {
    message.error(`Failed to add worktree: ${e}`)
  } finally {
    submitting.value = false
  }
}
</script>
