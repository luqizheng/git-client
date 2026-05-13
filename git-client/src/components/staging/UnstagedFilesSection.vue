<template>
  <div class="unstaged-section">
    <div class="section-header px-3 py-1.5 flex items-center justify-between cursor-pointer hover:bg-gray-750" @click="expanded = !expanded">
      <span class="text-xs text-yellow-400 font-medium">Unstaged Files ({{ files.length }})</span>
      <span class="text-gray-500 text-xs">{{ expanded ? '▾' : '▸' }}</span>
    </div>
    <div v-show="expanded">
      <div v-if="files.length > 0" class="px-2 pb-1">
        <button
          class="text-xs text-blue-400 hover:text-blue-300 px-1 py-0.5"
          @click="$emit('stage-all')"
        >Stage All Changes</button>
      </div>
      <n-scrollbar style="max-height: 200px;">
        <div
          v-for="file in files"
          :key="file.path"
          class="flex items-center px-2 py-1 mx-1 rounded cursor-pointer hover:bg-gray-750 gap-1.5"
          style="background: #2d2d2d;"
          @click="$emit('stage', file.path)"
        >
          <span class="text-yellow-400 font-mono text-xs w-4">+</span>
          <span class="text-gray-300 text-xs truncate flex-1">{{ file.path }}</span>
        </div>
      </n-scrollbar>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { NScrollbar } from 'naive-ui'
import type { FileDiff } from '../../types/git'

defineProps<{ files: FileDiff[] }>()
defineEmits<{ stage: [path: string]; 'stage-all': [] }>()

const expanded = ref(true)
</script>
