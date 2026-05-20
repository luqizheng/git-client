<template>
  <Transition name="fade">
    <div v-if="show" class="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div class="flex flex-col items-center gap-2">
        <div class="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span v-if="text" class="text-sm text-muted-foreground">{{ text }}</span>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
defineProps<{
  show: boolean
  text?: string
}>()
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
