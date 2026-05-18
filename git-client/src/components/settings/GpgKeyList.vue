<template>
  <div class="space-y-2">
    <div v-if="keys.length === 0" class="text-center py-8 text-gray-400">
      暂无 GPG 密钥
    </div>
    <gpg-key-item v-for="k in keys" :key="k.fingerprint" :gpg-key="k" @export="handleExport" @delete="handleDelete" />
  </div>
</template>

<script setup lang="ts">
import { toast } from 'vue-sonner';
import GpgKeyItem from './GpgKeyItem.vue';
import type { GpgKey } from '../../types/key';
import { gpgKeyApi } from '../../utils/keys';

defineProps<{
  keys: GpgKey[];
}>();

const emit = defineEmits<{
  refresh: [];
}>();

async function handleExport(key: GpgKey) {
  try {
    const content = await gpgKeyApi.exportPublicKey(key.id);
    await navigator.clipboard.writeText(content);
    toast.success('公钥已复制到剪贴板');
  } catch (e) {
    toast.error(`导出失败: ${e}`);
  }
}

async function handleDelete(key: GpgKey) {
  try {
    await gpgKeyApi.delete(key.id);
    toast.success('密钥已删除');
    emit('refresh');
  } catch (e) {
    toast.error(`删除失败: ${e}`);
  }
}
</script>
