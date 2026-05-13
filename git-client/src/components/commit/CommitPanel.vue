<template>
  <div class="border-l border-gray-700 flex flex-col" style="width: 320px;">
    <div class="p-2 text-xs text-gray-400 border-b border-gray-700 uppercase">Changes</div>
    <StageArea class="flex-1 overflow-y-auto" />
    <CommitEditor />
  </div>
</template>

<script setup lang="ts">
import StageArea from './StageArea.vue'
import CommitEditor from './CommitEditor.vue'
</script>
