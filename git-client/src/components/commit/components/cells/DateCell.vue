<script setup lang="ts">
import { computed } from 'vue'
import { formatRelativeTime } from '../../utils/commitHelpers'

const props = defineProps<{ timestamp: number }>()

const display = computed(() => formatRelativeTime(props.timestamp))
</script>

<template>
  <span class="date-cell text-xs text-[var(--commit-text-secondary)] whitespace-nowrap">{{ display }}</span>
</template>
