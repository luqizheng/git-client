<template>
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
</template>

<script setup lang="ts">
import Toolbar from './Toolbar.vue'
import Sidebar from './Sidebar.vue'
import StatusBar from './StatusBar.vue'
</script>
