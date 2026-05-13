<template>
  <div class="p-4">
    <n-button type="primary" block @click="$emit('open')">Open Repository</n-button>
    <n-button block class="mt-2" @click="showClone = true">Clone Repository</n-button>
    <CloneDialog v-model:show="showClone" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { NButton } from 'naive-ui'
import CloneDialog from './CloneDialog.vue'

defineEmits(['open'])
const showClone = ref(false)
</script>
