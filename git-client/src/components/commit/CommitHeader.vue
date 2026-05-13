<template>
  <div v-if="commit" class="commit-header p-3 border-b border-gray-700" style="background: #252526;">
    <div class="flex items-center gap-2 mb-2">
      <span class="font-mono text-blue-400 text-xs cursor-pointer hover:underline" @click="copySha">{{ shortSha }}</span>
      <n-button size="tiny" quaternary @click="copySha">📋</n-button>
    </div>
    <div class="text-gray-100 text-sm font-medium mb-1">{{ subject }}</div>
    <div v-if="body" class="text-gray-400 text-xs whitespace-pre-wrap mb-2">{{ body }}</div>
    <div class="text-gray-500 text-xs">{{ commit.author }} &lt;{{ commit.author_email }}&gt;</div>
    <div class="text-gray-500 text-xs">{{ formattedDate }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NButton, useMessage } from 'naive-ui'
import type { Commit } from '../../types/git'

const props = defineProps<{
  commit: Commit
}>()

const msg = useMessage()

const shortSha = computed(() => props.commit.id.slice(0, 7))
const subject = computed(() => props.commit.message.split('\n')[0])
const body = computed(() => {
  const lines = props.commit.message.split('\n').slice(1)
  return lines.length > 0 ? lines.join('\n') : ''
})
const formattedDate = computed(() => new Date(props.commit.time * 1000).toLocaleString())

async function copySha() {
  try {
    await navigator.clipboard.writeText(props.commit.id)
    msg.success(`Copied: ${props.commit.id.slice(0, 7)}`)
  } catch {
    msg.warning('Copy failed')
  }
}
</script>
