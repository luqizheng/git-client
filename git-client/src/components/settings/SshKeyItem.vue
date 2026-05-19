<template>
  <div class="flex items-center justify-between p-3 border-b border-border hover:bg-accent/50">
    <div class="flex items-center gap-3">
      <KeyIcon class="w-5 h-5 text-muted-foreground" />
      <div>
        <div class="font-medium">{{ sshKey.name }}</div>
        <div class="text-xs text-muted-foreground">
          {{ algorithmLabel }} �?{{ sshKey.fingerprint.substring(0, 16) }}...
          <Badge v-if="isInAgent" variant="default" class="ml-1 text-xs">Agent</Badge>
        </div>
        <div class="text-xs text-muted-foreground">创建�?{{ formatDate(sshKey.created_at) }}</div>
      </div>
    </div>
    <div class="flex gap-2">
      <Button size="sm" variant="outline" @click="$emit('view', sshKey)">查看公钥</Button>
      <Button size="sm" variant="outline" @click="$emit('copy', sshKey)">复制</Button>
      <Button
        v-if="!isInAgent"
        size="sm"
        variant="default"
        @click="$emit('addToAgent', sshKey)"
      >
        添加�?Agent
      </Button>
      <Button
        v-else
        size="sm"
        variant="outline"
        @click="$emit('removeFromAgent', sshKey)"
      >
        移除
      </Button>
      <Button size="sm" variant="destructive" @click="confirmDelete">删除</Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { KeyOutline as KeyIcon } from '@vicons/ionicons5';
import type { SshKey } from '../../types/key';
import { SshAlgorithm } from '../../types/key';

const props = defineProps<{
  sshKey: SshKey;
  isInAgent: boolean;
}>();

const emit = defineEmits<{
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

function confirmDelete() {
  if (confirm(`确定要删除密�?"${props.sshKey.name}" 吗？此操作不可撤销。`)) {
    emit('delete', props.sshKey);
  }
}
</script>
