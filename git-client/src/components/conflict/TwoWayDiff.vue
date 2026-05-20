<template>
  <div class="flex gap-2 h-full text-sm">
    <div class="flex-1 border border-border rounded overflow-hidden flex flex-col">
      <div
        class="px-3 py-2 cursor-pointer transition-colors"
        :class="isHoveringOurs ? 'bg-accent-red/10' : 'bg-accent-red/5'"
        @mouseenter="isHoveringOurs = true"
        @mouseleave="isHoveringOurs = false"
        @click="$emit('select-ours')"
      >
        <span class="text-accent-red font-medium">Ours (Current Branch)</span>
      </div>
      <pre class="flex-1 p-3 text-foreground overflow-auto font-mono text-xs leading-5 whitespace-pre-wrap">{{ ours }}</pre>
    </div>

    <div class="flex-1 border border-border rounded overflow-hidden flex flex-col">
      <div
        class="px-3 py-2 cursor-pointer transition-colors"
        :class="isHoveringTheirs ? 'bg-accent-green/10' : 'bg-accent-green/5'"
        @mouseenter="isHoveringTheirs = true"
        @mouseleave="isHoveringTheirs = false"
        @click="$emit('select-theirs')"
      >
        <span class="text-accent-green font-medium">Theirs (Incoming)</span>
      </div>
      <pre class="flex-1 p-3 text-foreground overflow-auto font-mono text-xs leading-5 whitespace-pre-wrap">{{ theirs }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  ours: string
  theirs: string
}>()

defineEmits<{
  'select-ours': []
  'select-theirs': []
}>()

const isHoveringOurs = ref(false)
const isHoveringTheirs = ref(false)
</script>
