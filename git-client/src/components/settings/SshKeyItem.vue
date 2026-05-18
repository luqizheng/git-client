<template>
  <div class="flex items-center justify-between p-3 border-b border-gray-700 hover:bg-gray-800/50">
    <div class="flex items-center gap-3">
      <n-icon :component="KeyIcon" size="20" />
      <div>
        <div class="font-medium">{{ sshKey.name }}</div>
        <div class="text-xs text-gray-400">
          {{ algorithmLabel }} • {{ sshKey.fingerprint.substring(0, 16) }}...
          <n-tag v-if="isInAgent" size="tiny" type="success">Agent</n-tag>
        </div>
        <div class="text-xs text-gray-500">创建于 {{ formatDate(sshKey.created_at) }}</div>
      </div>
    </div>
    <div class="flex gap-2">
      <n-button size="small" @click="$emit('view', sshKey)">查看公钥</n-button>
      <n-button size="small" @click="$emit('copy', sshKey)">复制</n-button>
      <n-button
        v-if="!isInAgent"
        size="small"
        type="primary"
        ghost
        @click="$emit('addToAgent', sshKey)"
      >
        添加到 Agent
      </n-button>
      <n-button
        v-else
        size="small"
        type="warning"
        ghost
        @click="$emit('removeFromAgent', sshKey)"
      >
        移除
      </n-button>
      <n-popconfirm @positive-click="$emit('delete', sshKey)">
        <template #trigger>
          <n-button size="small" type="error" ghost>删除</n-button>
        </template>
        确定要删除密钥 "{{ sshKey.name }}" 吗？此操作不可撤销。
      </n-popconfirm>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { NIcon, NButton, NTag, NPopconfirm } from 'naive-ui';
import { KeyOutline as KeyIcon } from '@vicons/ionicons5';
import type { SshKey } from '../../types/key';
import { SshAlgorithm } from '../../types/key';

const props = defineProps<{
  sshKey: SshKey;
  isInAgent: boolean;
}>();

defineEmits<{
  view: [key: SshKey];
  copy: [key: SshKey];
  delete: [key: SshKey];
  addToAgent: [key: SshKey];
  removeFromAgent: [key: SshKey];
}>();

const algorithmLabel = computed(() => {
  switch (props.sshKey.algorithm) {
    case SshAlgorithm.Ed25519:
      return 'Ed25519';
    case SshAlgorithm.Rsa:
      return 'RSA';
    case SshAlgorithm.Ecdsa:
      return 'ECDSA';
    default:
      return props.sshKey.algorithm;
  }
});

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString();
}
</script>
