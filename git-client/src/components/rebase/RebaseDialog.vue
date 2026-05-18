<template>
  <Dialog :open="showModel" @update:open="showModel = $event">
    <DialogContent class="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle>Rebase</DialogTitle>
      </DialogHeader>
      <div class="py-8 text-center text-muted-foreground">
        功能开发中...
      </div>
      <DialogFooter>
        <Button variant="outline" @click="showModel = false">Close</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

const props = defineProps<{ show: string | null }>()
const emit = defineEmits<{ 'update:show': [value: string | null] }>()

const showModel = computed({
  get: () => props.show === 'rebase',
  set: () => emit('update:show', null)
})
</script>
