<script setup lang="ts">
defineProps<{
  additions: number;
  deletions: number;
}>();
</script>

<template>
  <div class="flex items-center gap-2 text-xs font-mono">
    <span class="text-accent-green">+{{ additions }}</span>
    <span class="text-destructive">-{{ deletions }}</span>
  </div>
</template>
