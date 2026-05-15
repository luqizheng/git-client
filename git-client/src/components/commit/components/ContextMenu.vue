<template>
  <NDropdown
    trigger="manual"
    :x="x"
    :y="y"
    :options="menuOptions"
    :show="visible"
    placement="bottom-start"
    @select="handleSelect"
    @clickoutside="$emit('close')"
  />
</template>

<script setup lang="ts">
import { computed, h } from 'vue'
import { NDropdown } from 'naive-ui'
import type { DropdownOption } from 'naive-ui'
import type { Commit } from '../../../types/git'

const props = defineProps<{
  visible: boolean
  x: number
  y: number
  commit: Commit | null
}>()

const emit = defineEmits<{
  close: []
  'cherry-pick': [commitId: string]
  rebase: [commitId: string]
  'reset-soft': [commitId: string]
  'reset-mixed': [commitId: string]
  'reset-hard': [commitId: string]
  'create-branch': [commitId: string]
  'create-tag': [commitId: string]
  'copy-sha': [commitId: string]
}>()

const SVG_PATHS: Record<string, string> = {
  cherry: 'M12 2a7 7 0 00-7 7c0 2.38 1.19 4.47 3 5.74V17a2 2 0 002 2h4a2 2 0 002-2v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 00-7-7zM9 21h6',
  rebase: 'M4 12h16m-4-4l4 4-4 4',
  branch: 'M6 3v12m0 0a3 3 0 100 6 3 3 0 000-6zm12-6a3 3 0 100 6 3 3 0 000-6zM6 9h12',
  tag: 'M20.59 13.41l-7.17-7.17a2 2 0 00-1.41-.59H5a2 2 0 00-2 2v6.83a2 2 0 00.59 1.41l7.17 7.17a2 2 0 002.83 0l7-7a2 2 0 000-2.83zM8 11a1 1 0 110-2 1 1 0 010 2z',
  copy: 'M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z',
}

function renderIcon(name: string) {
  return () => h('svg', {
    class: 'w-4 h-4',
    fill: 'none',
    stroke: 'currentColor',
    viewBox: '0 0 24 24',
    innerHTML: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${SVG_PATHS[name] ?? ''}"/>`,
  })
}

const menuOptions = computed<DropdownOption[]>(() => [
  { key: 'cherry-pick', label: 'Cherry-pick this commit', icon: renderIcon('cherry') },
  { key: 'divider-1', type: 'divider' },
  { key: 'rebase', label: 'Rebase current branch onto this...', icon: renderIcon('rebase') },
  { key: 'reset-soft', label: 'Reset to this commit (Soft)' },
  { key: 'reset-mixed', label: 'Reset to this commit (Mixed)' },
  { key: 'reset-hard', label: 'Reset to this commit (Hard)', props: { style: 'color: var(--danger-color, #ef4444)' } },
  { key: 'divider-2', type: 'divider' },
  { key: 'create-branch', label: 'Create Branch here...', icon: renderIcon('branch') },
  { key: 'create-tag', label: 'Tag this version...', icon: renderIcon('tag') },
  { key: 'divider-3', type: 'divider' },
  { key: 'copy-sha', label: 'Copy SHA', icon: renderIcon('copy') },
])

function handleSelect(key: string) {
  if (!props.commit) return
  const id = props.commit.id

  switch (key) {
    case 'cherry-pick': emit('cherry-pick', id); break
    case 'rebase': emit('rebase', id); break
    case 'reset-soft': emit('reset-soft', id); break
    case 'reset-mixed': emit('reset-mixed', id); break
    case 'reset-hard': emit('reset-hard', id); break
    case 'create-branch': emit('create-branch', id); break
    case 'create-tag': emit('create-tag', id); break
    case 'copy-sha':
      navigator.clipboard.writeText(id)
      emit('copy-sha', id)
      break
  }
}
</script>
