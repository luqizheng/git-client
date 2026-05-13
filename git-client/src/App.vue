<template>
  <AppLayout>
    <div class="flex-1 flex">
      <GraphView />
      <DiffView />
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import AppLayout from './components/layout/AppLayout.vue'
import GraphView from './components/graph/GraphView.vue'
import DiffView from './components/diff/DiffView.vue'
</script>
