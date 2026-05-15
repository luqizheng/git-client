<template>
  <div class="branch-tag-cell" :style="{ width: width + 'px' }">
    <template v-for="ref in sortedRefs" :key="ref.name">
      <div
        class="branch-tag"
        :class="[ref.ref_type, { 'is-head': ref.is_head }]"
        draggable="true"
        @dragstart="handleDragStart($event, ref)"
      >
        <span class="tag-icon" :class="ref.ref_type" :style="{ background: getTagColor(ref) }"></span>
        <span class="tag-name">{{ truncateText(ref.name, 20) }}</span>
        <div class="tag-actions">
          <button class="action-btn" @click.stop="$emit('solo', ref.name)" title="Solo this branch">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
            </svg>
          </button>
          <button class="action-btn" @click.stop="$emit('hide', ref.name)" title="Hide this branch">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M3 3l18 18"/>
            </svg>
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Commit, CommitRef } from '../../../../types/git'
import { truncateText } from '../../utils/commitHelpers'

const props = defineProps<{
  commit: Commit
  width: number
}>()

defineEmits<{
  solo: [branchName: string]
  hide: [branchName: string]
}>()

const sortedRefs = computed(() => {
  return [...props.commit.refs].sort((a, b) => {
    if (a.is_head !== b.is_head) return a.is_head ? -1 : 1
    if (a.ref_type !== b.ref_type) {
      const order = { local: 0, remote: 1, tag: 2 }
      return order[a.ref_type] - order[b.ref_type]
    }
    return a.name.localeCompare(b.name)
  })
})

function getTagColor(ref: CommitRef): string {
  if (ref.is_head) return '#ffb74d'
  switch (ref.ref_type) {
    case 'local': return '#81c784'
    case 'remote': return '#64b5f6'
    case 'tag': return '#ba68c8'
    default: return '#90a4ae'
  }
}

function handleDragStart(e: DragEvent, ref: CommitRef) {
  e.dataTransfer!.setData('application/x-branch', JSON.stringify({
    branchName: ref.name,
    branchType: ref.ref_type,
  }))
  e.dataTransfer!.effectAllowed = 'move'
}
</script>

<style scoped>
.branch-tag-cell {
  padding: 0 8px;
  overflow: hidden;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}
.branch-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  cursor: grab;
  transition: all 0.15s ease;
  white-space: nowrap;
  height: 22px;
}
.branch-tag.local {
  background: rgba(76, 175, 80, 0.2);
  color: #81c784;
  border: 1px solid rgba(76, 175, 80, 0.4);
}
.branch-tag.remote {
  background: rgba(33, 150, 243, 0.2);
  color: #64b5f6;
  border: 1px solid rgba(33, 150, 243, 0.4);
}
.branch-tag.tag {
  background: rgba(156, 39, 176, 0.2);
  color: #ba68c8;
  border: 1px solid rgba(156, 39, 176, 0.4);
}
.branch-tag.is-head {
  background: rgba(255, 152, 0, 0.2);
  color: #ffb74d;
  border: 1px solid rgba(255, 152, 0, 0.5);
  box-shadow: 0 0 0 1px rgba(255, 152, 0, 0.3);
}
.tag-icon {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.tag-name {
  overflow: hidden;
  text-overflow: ellipsis;
}
.tag-actions {
  display: none;
  gap: 2px;
  margin-left: 2px;
}
.branch-tag:hover .tag-actions {
  display: inline-flex;
}
.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  opacity: 0.7;
}
.action-btn:hover {
  opacity: 1;
}
</style>
