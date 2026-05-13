<template>
  <div v-if="commit" class="p-3 border-b border-gray-700">
    <div class="text-sm font-mono text-blue-400">{{ commit.id.slice(0, 7) }}</div>
    <div class="text-sm text-gray-200 mt-1">{{ commit.message.split('\n')[0] }}</div>
    <div class="text-xs text-gray-500 mt-1">
      {{ commit.author }} &lt;{{ commit.author_email }}&gt;
    </div>
    <div class="text-xs text-gray-500">
      {{ new Date(commit.time * 1000).toLocaleString() }}
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Commit } from '../../types/git'
defineProps<{ commit: Commit | null }>()
</script>
