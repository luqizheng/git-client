<template>
  <div class="author-cell" :style="{ width: width + 'px' }">
    <div class="avatar" :style="{ background: avatarColor }">
      {{ initials }}
    </div>
    <span class="author-name">{{ commit.author }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Commit } from '../../../types/git'

const props = defineProps<{ commit: Commit; width: number }>()

const initials = computed(() => {
  return props.commit.author
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
})

const avatarColor = computed(() => {
  const colors = [
    '#667eea', '#764ba2', '#f093fb', '#f5576c',
    '#4facfe', '#00f2fe', '#43e97b', '#38f9d7',
    '#fa709a', '#fee140', '#30cfd0', '#330867'
  ]
  const hash = props.commit.author.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return colors[hash % colors.length]
})
</script>

<style scoped>
.author-cell {
  padding: 0 12px;
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: 8px;
}
.avatar {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
  color: white;
  flex-shrink: 0;
}
.author-name {
  font-size: 12px;
  color: var(--text-secondary, #969696);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
