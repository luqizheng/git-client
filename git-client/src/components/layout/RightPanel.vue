<template>
  <aside
    class="right-panel flex flex-col bg-gray-850 border-l border-gray-700 overflow-hidden"
    :style="{ width: rightPanel.width + 'px' }"
  >
    <div class="panel-header flex items-center justify-between px-3 py-2 border-b border-gray-700">
      <span class="text-xs text-gray-400 uppercase tracking-wide">
        {{ modeTitle }}
      </span>
      <button class="close-btn text-gray-500 hover:text-gray-200 text-sm leading-none" @click="rightPanel.hidePanel()">✕</button>
    </div>
    <div class="flex-1 overflow-hidden">
      <CommitDetails v-if="rightPanel.mode === 'commit'" />
      <StagingPanel v-else-if="rightPanel.mode === 'staging'" />
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRightPanelStore } from '../../stores/rightPanel'
import CommitDetails from '../commit/CommitDetails.vue'
import StagingPanel from '../staging/StagingPanel.vue'

const rightPanel = useRightPanelStore()

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
  transition: width 0.2s ease, opacity 0.2s ease;
  flex-shrink: 0;
}
.panel-header {
  flex-shrink: 0;
  background: #2d2d2d;
}
</style>
