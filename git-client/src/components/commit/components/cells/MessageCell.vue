<script setup lang="ts">
import { computed } from 'vue'
import { getFirstLine, highlightText } from '../../utils/commitHelpers'

const props = defineProps<{
  message: string
  query?: string
}>()

const parts = computed(() => highlightText(getFirstLine(props.message), props.query ?? ''))
</script>

<template>
  <span class="message-cell truncate text-sm leading-[40px]">
    <template v-for="(part, i) in parts" :key="i">
      <mark v-if="part.isHighlight" class="highlight bg-accent/30 text-accent rounded px-0.5">{{ part.text }}</mark>
      <span v-else>{{ part.text }}</span>
    </template>
  </span>
</template>
