<template>
  <Dialog :open="showModel" @update:open="showModel = $event">
    <DialogContent class="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle>Hook Management</DialogTitle>
      </DialogHeader>
      <div class="py-8 text-center text-muted-foreground">
         if ($args[0].Value -eq [char]8730) { '√' } elseif ($args[0].Value -eq [char]215) { '×' } elseif ($args[0].Value -eq [char]176) { '°' } else { '?' }  if ($args[0].Value -eq [char]8730) { '√' } elseif ($args[0].Value -eq [char]215) { '×' } elseif ($args[0].Value -eq [char]176) { '°' } else { '?' }  if ($args[0].Value -eq [char]8730) { '√' } elseif ($args[0].Value -eq [char]215) { '×' } elseif ($args[0].Value -eq [char]176) { '°' } else { '?' }  if ($args[0].Value -eq [char]8730) { '√' } elseif ($args[0].Value -eq [char]215) { '×' } elseif ($args[0].Value -eq [char]176) { '°' } else { '?' }  if ($args[0].Value -eq [char]8730) { '√' } elseif ($args[0].Value -eq [char]215) { '×' } elseif ($args[0].Value -eq [char]176) { '°' } else { '?' }  if ($args[0].Value -eq [char]8730) { '√' } elseif ($args[0].Value -eq [char]215) { '×' } elseif ($args[0].Value -eq [char]176) { '°' } else { '?' }  if ($args[0].Value -eq [char]8730) { '√' } elseif ($args[0].Value -eq [char]215) { '×' } elseif ($args[0].Value -eq [char]176) { '°' } else { '?' }  if ($args[0].Value -eq [char]8730) { '√' } elseif ($args[0].Value -eq [char]215) { '×' } elseif ($args[0].Value -eq [char]176) { '°' } else { '?' }  if ($args[0].Value -eq [char]8730) { '√' } elseif ($args[0].Value -eq [char]215) { '×' } elseif ($args[0].Value -eq [char]176) { '°' } else { '?' }  if ($args[0].Value -eq [char]8730) { '√' } elseif ($args[0].Value -eq [char]215) { '×' } elseif ($args[0].Value -eq [char]176) { '°' } else { '?' }  if ($args[0].Value -eq [char]8730) { '√' } elseif ($args[0].Value -eq [char]215) { '×' } elseif ($args[0].Value -eq [char]176) { '°' } else { '?' }  if ($args[0].Value -eq [char]8730) { '√' } elseif ($args[0].Value -eq [char]215) { '×' } elseif ($args[0].Value -eq [char]176) { '°' } else { '?' }  if ($args[0].Value -eq [char]8730) { '√' } elseif ($args[0].Value -eq [char]215) { '×' } elseif ($args[0].Value -eq [char]176) { '°' } else { '?' }  if ($args[0].Value -eq [char]8730) { '√' } elseif ($args[0].Value -eq [char]215) { '×' } elseif ($args[0].Value -eq [char]176) { '°' } else { '?' }  if ($args[0].Value -eq [char]8730) { '√' } elseif ($args[0].Value -eq [char]215) { '×' } elseif ($args[0].Value -eq [char]176) { '°' } else { '?' } ...
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
  get: () => props.show === 'hooks',
  set: () => emit('update:show', null)
})
</script>
