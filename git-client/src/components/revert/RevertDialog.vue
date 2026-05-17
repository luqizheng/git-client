<template>
  <n-modal
    v-model:show="showModel"
    title="Revert Commit"
    preset="card"
    style="width: 500px"
  >
    <n-empty description="功能开发中..." />
    <template #footer>
      <n-space justify="end">
        <n-button @click="showModel = false">Close</n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NModal, NEmpty, NButton, NSpace } from 'naive-ui'

const props = defineProps<{ show: string | null }>()
const emit = defineEmits<{ 'update:show': [value: string | null] }>()

const showModel = computed({
  get: () => props.show === 'revert',
  set: () => emit('update:show', null)
})
</script>
