<template>
  <div
    class="bg-gray-850 border-r border-gray-700 flex flex-col overflow-hidden transition-all duration-200"
    :style="{ width: app.sidebarCollapsed ? '48px' : app.sidebarWidth + 'px' }"
  >
    <div class="p-2 flex items-center justify-between border-b border-gray-700">
      <span v-if="!app.sidebarCollapsed" class="text-xs text-gray-400 uppercase tracking-wide">Explorer</span>
      <n-button quaternary size="tiny" @click="app.toggleSidebar">
        {{ app.sidebarCollapsed ? '▸' : '◂' }}
      </n-button>
    </div>

    <div v-if="!app.sidebarCollapsed" class="flex-1 overflow-y-auto">
      <div class="p-2">
        <div class="text-xs text-gray-500 mb-1">Branches</div>
        <BranchTree />
      </div>
      <div class="p-2 border-t border-gray-700">
        <div class="text-xs text-gray-500 mb-1">Remotes</div>
        <RemotePanel />
      </div>
      <div class="p-2 border-t border-gray-700">
        <div class="text-xs text-gray-500 mb-1">Stash</div>
        <div class="text-xs text-gray-600">No stash entries</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { NButton } from 'naive-ui'
import { useAppStore } from '../../stores/app'
import BranchTree from '../branch/BranchTree.vue'
import RemotePanel from '../remote/RemotePanel.vue'

const app = useAppStore()
</script>
