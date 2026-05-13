<template>
  <div class="commit-editor-section border-t px-3 py-2 flex-shrink-0" style="border-color: #3c3c3c; background: #252526;">
    <div class="flex items-center gap-1 mb-1.5">
      <n-button type="primary" size="small" :disabled="!canCommit" @click="$emit('commit')" style="background: #0e639c;">
        ⚡ Commit
      </n-button>
      <n-checkbox v-model:checked="amendVal" size="small">Amend</n-checkbox>
    </div>
    <n-input
      :value="summary"
      placeholder="Summary (required)"
      size="small"
      class="mb-1"
      @update:value="(v: string) => $emit('update:summary', v)"
    />
    <n-input
      :value="description"
      type="textarea"
      :rows="2"
      placeholder="Description (optional)"
      size="small"
      class="mb-1.5"
      @update:value="(v: string) => $emit('update:description', v)"
    />
    <button
      class="w-full py-1.5 text-xs rounded border transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      :class="canCommit
        ? 'border-green-600 text-green-400 hover:bg-green-900/20'
        : 'border-gray-600 text-gray-500'"
      :disabled="!canCommit"
      @click="$emit('commit')"
    >
      ⚡ Stage Changes to Commit
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NInput, NButton, NCheckbox } from 'naive-ui'

const props = defineProps<{
  summary: string
  description: string
  amend: boolean
  hasStagedFiles: boolean
}>()

defineEmits<{
  commit: []
  'update:summary': [value: string]
  'update:description': [value: string]
  'update:amend': [value: boolean]
}>()

const amendVal = computed({
  get: () => props.amend,
  set: (_v) => { /* handled by parent via emit */ }
})

const canCommit = computed(() => props.summary.trim().length > 0 && props.hasStagedFiles)
</script>
