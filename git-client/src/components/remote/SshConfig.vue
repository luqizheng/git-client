<template>
  <div class="p-2 text-xs">
    <div class="text-gray-400 mb-1">SSH Key Configuration</div>
    <div class="space-y-2">
      <div class="grid grid-cols-4 items-center gap-2">
        <Label class="text-right">SSH Key Path</Label>
        <Input v-model="sshKeyPath" placeholder="~/.ssh/id_ed25519" class="col-span-3" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const sshKeyPath = ref('')
</script>
