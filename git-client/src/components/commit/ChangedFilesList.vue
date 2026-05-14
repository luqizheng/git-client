<template>
  <div class="changed-files p-2">
    <div class="text-xs text-gray-500 uppercase tracking-wide mb-2 px-1">
      Changed Files ({{ files.length }})
    </div>
    <n-scrollbar v-if="files.length > 0">
      <div
        v-for="file in files"
        :key="file.path"
        class="file-item flex items-center gap-1.5 px-2 py-1.5 cursor-pointer rounded transition-colors mb-0.5"
        :class="{ 'bg-gray-750': selectedFile === file.path }"
        style="background: #2d2d2d;"
        @click="$emit('select', file.path)"
      >
        <span class="font-mono text-xs w-4" :class="statusTextColor(file.status)">{{ statusIcon(file.status) }}</span>
        <span class="text-gray-300 text-xs truncate flex-1">{{ file.path }}</span>
      </div>
    </n-scrollbar>
    <div v-else class="text-gray-600 text-xs px-2 py-3">No changed files</div>
  </div>
</template>

<script setup lang="ts">
import { NScrollbar } from 'naive-ui'
import type { FileDiff, DiffStatus } from '../../types/git'
import { statusIcon } from '../../utils/diff'

defineProps<{
  files: FileDiff[]
  selectedFile: string | null
}>()

defineEmits<{
  select: [path: string]
}>()

function statusTextColor(status: DiffStatus): string {
  const map: Record<DiffStatus, string> = {
    Added: 'text-[#e2c08d]',
    Modified: 'text-[#73c991]',
    Deleted: 'text-[#f14c4c]',
    Renamed: 'text-[#dcdcaa]',
    Copied: 'text-[#dcdcaa]',
  }
  return map[status]
}
</script>

<style scoped>
.file-item:hover {
  filter: brightness(1.2);
}
.file-item:hover::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #0e639c;
}
.file-item {
  position: relative;
}
</style>
