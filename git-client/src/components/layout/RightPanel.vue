<template>
  <aside class="right-panel flex flex-col overflow-hidden w-full h-full">
    <div class="panel-tabs">
      <button
        class="panel-tab"
        :class="{ 'tab-active': rightPanel.mode === 'staging' }"
        @click="rightPanel.mode = 'staging'"
      >
        Staging
      </button>
      <button
        class="panel-tab"
        :class="{ 'tab-active': rightPanel.mode === 'commit' }"
        @click="rightPanel.mode = 'commit'"
      >
        Commit Detail
      </button>
    </div>
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
  background: var(--background);
  border-left: 1px solid var(--border);
}

.panel-tabs {
  display: flex;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.panel-tab {
  flex: 1;
  padding: 6px 0;
  font-size: 11px;
  font-weight: 500;
  color: var(--muted-foreground);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
  border-bottom: 2px solid transparent;
}

.panel-tab:hover {
  color: var(--foreground);
}

.tab-active {
  color: var(--primary);
  border-bottom-color: var(--primary);
}
</style>
