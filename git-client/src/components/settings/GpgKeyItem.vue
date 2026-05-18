<template>
  <div class="flex items-center justify-between p-3 border-b border-gray-700 hover:bg-gray-800/50">
    <div class="flex items-center gap-3">
      <n-icon :component="ShieldIcon" size="20" />
      <div>
        <div class="font-medium">{{ gpgKey.user_ids[0] || gpgKey.id }}</div>
        <div class="text-xs text-gray-400">
          {{ gpgKey.algorithm }} {{ gpgKey.length }}位
          • {{ gpgKey.fingerprint.substring(0, 16) }}...
        </div>
        <div v-if="gpgKey.expires_at" class="text-xs text-gray-500">
          过期: {{ formatDate(gpgKey.expires_at) }}
        </div>
      </div>
    </div>
    <div class="flex gap-2">
      <n-button size="small" @click="$emit('export', gpgKey)">导出公钥</n-button>
      <n-popconfirm @positive-click="$emit('delete', gpgKey)">
        <template #trigger>
          <n-button size="small" type="error" ghost>删除</n-button>
        </template>
        确定要删除此 GPG 密钥吗？
      </n-popconfirm>
    </div>
  </div>
</template>

<script setup lang="ts">
import { NIcon, NButton, NPopconfirm } from 'naive-ui';
import { ShieldCheckmark as ShieldIcon } from '@vicons/ionicons5';
import type { GpgKey } from '../../types/key';

defineProps<{
  gpgKey: GpgKey;
}>();

defineEmits<{
  export: [key: GpgKey];
  delete: [key: GpgKey];
}>();

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString();
}
</script>
