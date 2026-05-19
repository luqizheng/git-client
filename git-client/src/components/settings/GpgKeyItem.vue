<template>
  <div class="flex items-center justify-between p-3 border-b border-border hover:bg-accent/50">
    <div class="flex items-center gap-3">
      <ShieldIcon class="w-5 h-5 text-muted-foreground" />
      <div>
        <div class="font-medium">{{ gpgKey.user_ids[0] || gpgKey.id }}</div>
        <div class="text-xs text-muted-foreground">
          {{ gpgKey.algorithm }} {{ gpgKey.length }}�?
          �?{{ gpgKey.fingerprint.substring(0, 16) }}...
        </div>
        <div v-if="gpgKey.expires_at" class="text-xs text-muted-foreground">
          过期: {{ formatDate(gpgKey.expires_at) }}
        </div>
      </div>
    </div>
    <div class="flex gap-2">
      <Button size="sm" variant="outline" @click="$emit('export', gpgKey)">导出公钥</Button>
      <Button size="sm" variant="destructive" @click="confirmDelete">删除</Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { ShieldCheckmark as ShieldIcon } from '@vicons/ionicons5';
import type { GpgKey } from '../../types/key';

const props = defineProps<{
  gpgKey: GpgKey;
}>();

const emit = defineEmits<{
  export: [key: GpgKey];
  delete: [key: GpgKey];
}>();

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString();
}

function confirmDelete() {
  if (confirm('确定要删除此 GPG 密钥吗？')) {
    emit('delete', props.gpgKey);
  }
}
</script>
