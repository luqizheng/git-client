<template>
  <div ref="containerRef" class="w-full h-full" />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'

interface DiffEditorInstance {
  dispose(): void
  goToDiff?(direction: 'next' | 'previous'): void
}

const props = defineProps<{
  original: string
  modified: string
  language?: string
  renderSideBySide?: boolean
  readOnly?: boolean
}>()

const emit = defineEmits<{
  'update:modified': [value: string]
}>()

const containerRef = ref<HTMLElement | null>(null)
let editor!: DiffEditorInstance | null

onMounted(() => {
  // Monaco will be loaded dynamically
  containerRef.value
})

watch(() => [props.original, props.modified], () => {
  if (!editor) return
  // Update editor content
})

onUnmounted(() => {
  editor?.dispose()
})

function goToNextChange() {
  editor?.goToDiff?.('next')
}

function goToPrevChange() {
  editor?.goToDiff?.('previous')
}

defineExpose({ goToNextChange, goToPrevChange })
</script>
