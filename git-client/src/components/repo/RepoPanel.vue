<template>
  <div class="p-4">
    <Button class="w-full" @click="$emit('open')">Open Repository</Button>
    <Button variant="outline" class="w-full mt-2" @click="showClone = true">Clone Repository</Button>
    <CloneDialog v-model:show="showClone" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Button } from '@/components/ui/button'
import CloneDialog from './CloneDialog.vue'

defineEmits(['open'])
const showClone = ref(false)
</script>
