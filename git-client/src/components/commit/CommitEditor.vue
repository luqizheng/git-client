<template>
  <div class="p-2 border-t border-gray-700">
    <div class="flex gap-1 mb-1">
      <Select v-model="template" @update:model-value="applyTemplate">
        <SelectTrigger class="w-32 h-7 text-xs">
          <SelectValue placeholder="Template" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="opt in templateOptions" :key="opt.value" :value="opt.value" class="text-xs">
            {{ opt.label }}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
    <Textarea
      v-model="message"
      :rows="4"
      placeholder="Commit message..."
      class="text-sm resize-none"
    />
    <div class="flex items-center gap-2 mt-2">
      <div class="flex items-center gap-1">
        <Checkbox id="amend" v-model:checked="amend" />
        <label for="amend" class="text-sm cursor-pointer">Amend</label>
      </div>
      <div class="flex-1" />
      <Button size="sm" :disabled="!message.trim()" @click="doCommit">
        Commit
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { toast } from 'vue-sonner'
import { invoke } from '../../utils/ipc'
import { useRepoStore } from '../../stores/repo'
import { useCommitsStore } from '../../stores/commits'
import type { Commit } from '../../types/git'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

const repo = useRepoStore()
const commits = useCommitsStore()
const message = ref('')
const amend = ref(false)
const template = ref<string | undefined>(undefined)

const templateOptions = [
  { label: 'feat:', value: 'feat: ' },
  { label: 'fix:', value: 'fix: ' },
  { label: 'docs:', value: 'docs: ' },
  { label: 'refactor:', value: 'refactor: ' },
  { label: 'chore:', value: 'chore: ' },
]

function applyTemplate(val: unknown) {
  if (typeof val !== 'string') return
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
    template.value = undefined
    toast.success('Committed')
    await commits.fetchLogs(repo.activeRepoPath)
  } catch (e) {
    toast.error(String(e))
  }
}
</script>
