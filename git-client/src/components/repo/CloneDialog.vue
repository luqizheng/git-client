<template>
  <n-modal v-model:show="show" preset="dialog" title="Clone Repository">
    <n-form>
      <n-form-item label="URL">
        <n-input v-model:value="url" placeholder="https://github.com/user/repo.git" />
      </n-form-item>
      <n-form-item label="Local Path">
        <n-input v-model:value="path" placeholder="/path/to/clone" />
      </n-form-item>
    </n-form>
    <template #action>
      <n-button @click="show = false">Cancel</n-button>
      <n-button type="primary" :loading="loading" @click="doClone">Clone</n-button>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { NModal, NForm, NFormItem, NInput, NButton, useMessage } from 'naive-ui'
import { useRepoStore } from '../../stores/repo'

const show = defineModel<boolean>('show', { default: false })
const url = ref('')
const path = ref('')
const loading = ref(false)
const repo = useRepoStore()
const message = useMessage()

async function doClone() {
  if (!url.value || !path.value) return
  loading.value = true
  try {
    await repo.cloneRepo(url.value, path.value)
    show.value = false
    message.success('Clone successful')
  } catch (e) {
    message.error(String(e))
  } finally {
    loading.value = false
  }
}
</script>
