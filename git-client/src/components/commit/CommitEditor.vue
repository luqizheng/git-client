<template>
  <div class="p-2 border-t border-gray-700">
    <div class="flex gap-1 mb-1">
      <n-select
        v-model:value="template"
        :options="templateOptions"
        size="tiny"
        class="w-32"
        @update:value="applyTemplate"
      />
    </div>
    <n-input
      v-model:value="message"
      type="textarea"
      :rows="4"
      placeholder="Commit message..."
      class="text-sm"
    />
    <div class="flex items-center gap-1 mt-1">
      <n-checkbox v-model:checked="amend">Amend</n-checkbox>
      <div class="flex-1" />
      <n-button type="primary" size="small" :disabled="!message.trim()" @click="doCommit">
        Commit
      </n-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { NInput, NButton, NSelect, NCheckbox, useMessage } from 'naive-ui'
import { invoke } from '../../utils/ipc'
import { useRepoStore } from '../../stores/repo'
import { useCommitsStore } from '../../stores/commits'
import type { Commit } from '../../types/git'

const repo = useRepoStore()
const commits = useCommitsStore()
const message = ref('')
const amend = ref(false)
const template = ref<string | null>(null)
const msgApi = useMessage()

const templateOptions = [
  { label: 'feat:', value: 'feat: ' },
  { label: 'fix:', value: 'fix: ' },
  { label: 'docs:', value: 'docs: ' },
  { label: 'refactor:', value: 'refactor: ' },
  { label: 'chore:', value: 'chore: ' },
]

function applyTemplate(val: string) {
  if (!message.value.startsWith(val)) {
    message.value = val + message.value.replace(/^(feat|fix|docs|refactor|chore):\s*/, '')
  }
}

async function doCommit() {
  if (!repo.activeRepoPath || !message.value.trim()) return
  try {
    await invoke<Commit>('commit', {
      repoPath: repo.activeRepoPath,
      message: message.value,
      amend: amend.value,
    })
    message.value = ''
    amend.value = false
    msgApi.success('Committed')
    await commits.fetchLogs(repo.activeRepoPath)
  } catch (e) {
    msgApi.error(String(e))
  }
}
</script>
