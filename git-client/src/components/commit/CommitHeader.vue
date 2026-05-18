<template>
  <div v-if="commit" class="commit-header p-3 border-b border-gray-700" style="background: #252526;">
    <div class="flex items-center gap-2 mb-2">
      <span class="font-mono text-blue-400 text-xs cursor-pointer hover:underline" @click="copySha">{{ shortSha }}</span>
      <n-button size="tiny" quaternary @click="copySha">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
        </svg>
      </n-button>
    </div>
    <div class="text-gray-100 text-sm font-medium mb-1">{{ subject }}</div>
    <div v-if="body" class="text-gray-400 text-xs whitespace-pre-wrap mb-2">{{ body }}</div>
    <div class="text-gray-500 text-xs">{{ commit.author }} &lt;{{ commit.author_email }}&gt;</div>
    <div class="text-gray-500 text-xs">{{ formattedDate }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NButton } from 'naive-ui'
import { toast } from 'vue-sonner'
import type { Commit } from '../../types/git'

const props = defineProps<{
  commit: Commit
}>()

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
    toast.success(`Copied: ${props.commit.id.slice(0, 7)}`)
  } catch {
    toast.warning('Copy failed')
  }
}
</script>
