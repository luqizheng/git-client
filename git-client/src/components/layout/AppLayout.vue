<template>
  <n-config-provider :theme="themeOverrides">
    <n-message-provider>
      <div class="h-screen flex flex-col bg-gray-900 text-gray-100">
        <Toolbar />
        <div class="flex flex-1 overflow-hidden">
          <Sidebar />
          <main class="flex-1 flex flex-col overflow-hidden">
            <slot />
          </main>
        </div>
        <StatusBar />
      </div>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { darkTheme } from 'naive-ui'
import Toolbar from './Toolbar.vue'
import Sidebar from './Sidebar.vue'
import StatusBar from './StatusBar.vue'
import { useAppStore } from '../../stores/app'

const app = useAppStore()
const themeOverrides = computed(() => app.theme === 'dark' ? darkTheme : null)
</script>
