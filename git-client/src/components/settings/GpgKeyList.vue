<template>
  <div class="space-y-2">
    <div v-if="keys.length === 0" class="text-center py-8 text-gray-400">
      暂无 GPG 密钥
    </div>
    <gpg-key-item v-for="key in keys" :key="key.id" :gpg-key="key" @export="handleExport" @delete="handleDelete" />
  </div>
</template>

<script setup lang="ts">
import { useMessage } from 'naive-ui';
import GpgKeyItem from './GpgKeyItem.vue';
import type { GpgKey } from '../../types/key';
import { gpgKeyApi } from '../../utils/keys';

defineProps<{
  keys: GpgKey[];
}>();

const emit = defineEmits<{
  refresh: [];
}>();

const message = useMessage();

async function handleExport(key: GpgKey) {
  try {
    const content = await gpgKeyApi.exportPublicKey(key.id);
    await navigator.clipboard.writeText(content);
    message.success('公钥已复制到剪贴板');
  } catch (e) {
    message.error(`导出失败: ${e}`);
  }
}

async function handleDelete(key: GpgKey) {
  try {
    await gpgKeyApi.delete(key.id);
    message.success('密钥已删除');
    emit('refresh');
  } catch (e) {
    message.error(`删除失败: ${e}`);
  }
}
</script>
