<template>
  <aside
    ref="panelRef"
    class="right-panel flex flex-col bg-gray-850 border-l border-gray-700 overflow-hidden w-full h-full"
  >
    <div v-if="isCollapsed" class="flex items-center justify-center h-full cursor-pointer hover:bg-gray-700/50 transition-colors" @click="expandPanel" title="Expand Panel">
      <n-icon :size="20" class="text-gray-500"><ChevronBack /></n-icon>
    </div>
    <template v-else>
      <div class="panel-header flex items-center justify-between px-3 py-2 border-b border-gray-700">
        <span class="text-xs text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
          <component :is="modeIcon" :size="12" class="text-gray-500" />
          {{ modeTitle }}
        </span>
        <n-button quaternary size="tiny" @click="collapsePanel" title="Collapse Panel">
          <template #icon>
            <n-icon :size="14"><ChevronForward /></n-icon>
          </template>
        </n-button>
      </div>
      <div class="flex-1 overflow-hidden">
        <CommitDetails v-if="rightPanel.mode === 'commit'" />
        <StagingPanel v-else-if="rightPanel.mode === 'staging'" />
      </div>
    </template>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, h } from 'vue'
import { NButton, NIcon } from 'naive-ui'
import { ChevronBack, ChevronForward, GitCommit, Pencil } from '@vicons/ionicons5'
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

function collapsePanel() {
  const parent = panelRef.value?.parentElement as HTMLElement | null
  if (parent) {
    const split = parent.closest('[data-split]')
    if (split) {
      const pane2 = split.querySelector('[style*="overflow: hidden"]') as HTMLElement
      if (pane2) {
        pane2.style.flexBasis = '40px'
      }
    }
  }
  isCollapsed.value = true
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

const modeIcon = computed(() => {
  switch (rightPanel.mode) {
    case 'commit': return h(GitCommit)
    case 'staging': return h(Pencil)
    default: return null
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