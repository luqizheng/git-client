<template>
  <div class="flex flex-col items-center justify-center h-full gap-3 text-center p-6">
    <div v-if="icon" class="text-muted-foreground opacity-40">
      <component :is="icon" class="w-12 h-12" />
    </div>
    <div class="space-y-1">
      <p class="text-sm font-medium text-foreground">{{ title }}</p>
      <p v-if="description" class="text-xs text-muted-foreground">{{ description }}</p>
    </div>
    <slot />
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{
  title: string
  description?: string
  icon?: Component
}>()
</script>
