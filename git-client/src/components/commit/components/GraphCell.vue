<template>
  <div class="graph-cell" :style="{ width: width + 'px' }" />
</template>

<script setup lang="ts">
defineProps<{ width: number }>()
</script>

<style scoped>
.graph-cell {
  flex-shrink: 0;
}
</style>
