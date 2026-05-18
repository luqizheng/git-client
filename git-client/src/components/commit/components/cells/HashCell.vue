<script setup lang="ts">
defineProps<{ hash: string }>()
</script>

<template>
  <span class="hash-cell font-mono text-xs text-muted-foreground select-all">{{ hash.slice(0, 7) }}</span>
</template>
