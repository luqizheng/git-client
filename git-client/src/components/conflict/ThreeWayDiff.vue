<template>
  <div class="flex gap-1 h-full text-xs">
    <div class="flex-1 border border-border rounded overflow-hidden">
      <div class="bg-accent-red/20 text-accent-red px-2 py-0.5">Ours</div>
      <pre class="p-2 text-foreground overflow-auto h-[calc(100%-24px)]">{{ ours }}</pre>
    </div>
    <div class="flex-1 border border-border rounded overflow-hidden">
      <div class="bg-muted text-muted-foreground px-2 py-0.5">Base</div>
      <pre class="p-2 text-foreground overflow-auto h-[calc(100%-24px)]">{{ base }}</pre>
    </div>
    <div class="flex-1 border border-border rounded overflow-hidden">
      <div class="bg-accent-green/20 text-accent-green px-2 py-0.5">Theirs</div>
      <pre class="p-2 text-foreground overflow-auto h-[calc(100%-24px)]">{{ theirs }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  ours: string
  base: string
  theirs: string
}>()
</script>
