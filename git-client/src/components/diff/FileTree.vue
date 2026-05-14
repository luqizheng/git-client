<template>
  <div class="text-xs overflow-y-auto h-full">
    <div
      v-for="file in files"
      :key="file.path"
      class="flex items-center px-2 py-1 cursor-pointer hover:bg-gray-700"
      :class="{ 'bg-gray-700': selected === file.path }"
      @click="$emit('select', file.path)"
    >
      <span class="w-4 text-center mr-1" :class="statusColor(file.status)">
        {{ statusIcon(file.status) }}
      </span>
      <span class="truncate text-gray-300">{{ file.path }}</span>
    </div>
    <div v-if="files.length === 0" class="text-gray-600 p-2">No changes</div>
  </div>
</template>

<script setup lang="ts">
import type { FileDiff, DiffStatus } from '../../types/git'
import { statusIcon } from '../../utils/diff'

defineProps<{
  files: FileDiff[]
  selected: string | null
}>()

defineEmits<{ select: [path: string] }>()

function statusColor(status: DiffStatus): string {
  switch (status) {
    case 'Added': return 'text-green-400'
    case 'Modified': return 'text-yellow-400'
    case 'Deleted': return 'text-red-400'
    case 'Renamed': return 'text-blue-400'
    case 'Copied': return 'text-blue-400'
  }
}
</script>
