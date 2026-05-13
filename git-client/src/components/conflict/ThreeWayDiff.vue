<template>
  <div class="flex gap-1 h-full text-xs">
    <div class="flex-1 border border-gray-700 rounded overflow-hidden">
      <div class="bg-red-900/30 text-red-400 px-2 py-0.5">Ours</div>
      <pre class="p-2 text-gray-300 overflow-auto h-[calc(100%-24px)]">{{ ours }}</pre>
    </div>
    <div class="flex-1 border border-gray-700 rounded overflow-hidden">
      <div class="bg-gray-700 text-gray-400 px-2 py-0.5">Base</div>
      <pre class="p-2 text-gray-300 overflow-auto h-[calc(100%-24px)]">{{ base }}</pre>
    </div>
    <div class="flex-1 border border-gray-700 rounded overflow-hidden">
      <div class="bg-green-900/30 text-green-400 px-2 py-0.5">Theirs</div>
      <pre class="p-2 text-gray-300 overflow-auto h-[calc(100%-24px)]">{{ theirs }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  ours: string
  base: string
  theirs: string
}>()
</script>
