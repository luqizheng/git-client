<template>
  <aside
    ref="panelRef"
    class="right-panel flex flex-col bg-gray-850 border-l border-gray-700 overflow-hidden w-full h-full"
  >
    <div v-if="isCollapsed" class="flex items-center justify-center h-full cursor-pointer hover:bg-gray-700/50" @click="expandPanel">
      <span class="text-gray-500 text-lg">◂</span>
    </div>
    <template v-else>
      <div class="panel-header flex items-center justify-between px-3 py-2 border-b border-gray-700">
        <span class="text-xs text-gray-400 uppercase tracking-wide">
          {{ modeTitle }}
        </span>
      </div>
      <div class="flex-1 overflow-hidden">
        <CommitDetails v-if="rightPanel.mode === 'commit'" />
        <StagingPanel v-else-if="rightPanel.mode === 'staging'" />
      </div>
    </template>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRightPanelStore } from '../../stores/rightPanel'
import CommitDetails from '../commit/CommitDetails.vue'
import StagingPanel from '../staging/StagingPanel.vue'

const rightPanel = useRightPanelStore()
const panelRef = ref<HTMLElement | null>(null)
const isCollapsed = ref(false)
let observer: ResizeObserver | null = null

const COLLAPSE_THRESHOLD = 60

function checkCollapsed() {
  if (panelRef.value) {
    isCollapsed.value = panelRef.value.offsetWidth <= COLLAPSE_THRESHOLD
  }
}

function expandPanel() {
  const parent = panelRef.value?.parentElement as HTMLElement | null
  if (parent) {
    const split = parent.closest('[data-split]')
    if (split) {
      const pane2 = split.querySelector('[style*="overflow: hidden"]') as HTMLElement
      if (pane2) {
        pane2.style.flexBasis = '40%'
      }
    }
  }
  isCollapsed.value = false
}

onMounted(() => {
  checkCollapsed()
  if (panelRef.value) {
    observer = new ResizeObserver(checkCollapsed)
    observer.observe(panelRef.value)
  }
})

onUnmounted(() => {
  observer?.disconnect()
})

const modeTitle = computed(() => {
  switch (rightPanel.mode) {
    case 'commit': return 'Commit Details'
    case 'staging': return 'Working Files'
    default: return ''
  }
})
</script>

<style scoped>
.right-panel {
  transition: opacity 0.2s ease;
}
.panel-header {
  flex-shrink: 0;
  background: #2d2d2d;
}
</style>
