<template>
  <div v-if="conflicts.length > 0" class="flex flex-col h-full">
    <div class="p-2 border-b border-gray-700 flex items-center gap-2">
      <span class="text-yellow-400 text-sm font-bold">{{ conflicts.length }} Conflicts</span>
      <div class="flex-1" />
      <n-button size="small" type="primary" :disabled="unresolvedCount > 0" @click="$emit('complete')">
        Complete Merge
      </n-button>
    </div>
    <div class="flex-1 overflow-y-auto">
      <div v-for="(conflict, idx) in conflicts" :key="conflict.path"
        class="border-b border-gray-700 p-2"
      >
        <div class="flex items-center mb-1">
          <span :class="resolved[idx] ? 'text-green-400' : 'text-red-400'">
            {{ resolved[idx] ? '✓' : '✗' }}
          </span>
          <span class="ml-1 text-sm text-gray-300">{{ conflict.path }}</span>
          <div class="flex-1" />
          <n-button size="tiny" @click="chooseOurs(idx)">Ours</n-button>
          <n-button size="tiny" @click="chooseTheirs(idx)">Theirs</n-button>
          <n-button size="tiny" @click="chooseBase(idx)">Base</n-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { NButton } from 'naive-ui'
import type { ConflictFile } from '../../types/git'

const props = defineProps<{
  conflicts: ConflictFile[]
}>()

defineEmits<{ complete: [] }>()

const resolved = ref<boolean[]>(new Array(props.conflicts.length).fill(false))

const unresolvedCount = computed(() => resolved.value.filter(r => !r).length)

function chooseOurs(idx: number) { resolved.value[idx] = true }
function chooseTheirs(idx: number) { resolved.value[idx] = true }
function chooseBase(idx: number) { resolved.value[idx] = true }
</script>
