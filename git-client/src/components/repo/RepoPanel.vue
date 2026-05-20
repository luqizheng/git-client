<template>
  <div class="p-6 flex flex-col items-center justify-center h-full gap-4">
    <FolderOpen class="w-16 h-16 text-muted-foreground opacity-30" />
    <div class="text-center space-y-1">
      <p class="text-sm font-medium">No repository open</p>
      <p class="text-xs text-muted-foreground">Open or clone a repository to get started</p>
    </div>
    <div class="flex flex-col gap-2 w-full max-w-xs">
      <Button class="w-full" @click="$emit('open')">Open Repository</Button>
      <Button variant="outline" class="w-full" @click="showClone = true">Clone Repository</Button>
    </div>
    <CloneDialog v-model:show="showClone" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { FolderOpen } from '@vicons/ionicons5'
import { Button } from '@/components/ui/button'
import CloneDialog from './CloneDialog.vue'

defineEmits(['open'])
const showClone = ref(false)
</script>
