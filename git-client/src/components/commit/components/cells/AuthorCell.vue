<script setup lang="ts">
defineProps<{ author: string }>()
</script>

<template>
  <span class="author-cell truncate text-sm text-foreground">{{ author }}</span>
</template>
