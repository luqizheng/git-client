<template>
  <div class="flex items-center justify-between p-3 border-b border-gray-700 hover:bg-gray-800/50">
    <div class="flex items-center gap-3">
      <n-icon :component="ShieldIcon" size="20" />
      <div>
        <div class="font-medium">{{ key.user_ids[0] || key.id }}</div>
        <div class="text-xs text-gray-400">
          {{ key.algorithm }} {{ key.length }}位
          • {{ key.fingerprint.substring(0, 16) }}...
        </div>
        <div v-if="key.expires_at" class="text-xs text-gray-500">
          过期: {{ formatDate(key.expires_at) }}
        </div>
      </div>
    </div>
    <div class="flex gap-2">
      <n-button size="small" @click="$emit('export', key)">导出公钥</n-button>
      <n-popconfirm @positive-click="$emit('delete', key)">
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
  key: GpgKey;
}>();

defineEmits<{
  export: [key: GpgKey];
  delete: [key: GpgKey];
}>();

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString();
}
</script>
