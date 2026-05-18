<template>
  <aside class="right-panel flex flex-col overflow-hidden w-full h-full">
    <div class="flex-1 overflow-hidden">
      <CommitDetails v-if="rightPanel.mode === 'commit'" />
      <StagingPanel v-else-if="rightPanel.mode === 'staging'" />
    </div>
  </aside>
</template>

<script setup lang="ts">
import { useRightPanelStore } from '../../stores/rightPanel'
import CommitDetails from '../commit/CommitDetails.vue'
import StagingPanel from '../staging/StagingPanel.vue'

const rightPanel = useRightPanelStore()
</script>

<style scoped>
.right-panel {
  background: var(--bg-primary);
  border-left: 1px solid var(--border-color);
}
</style>
