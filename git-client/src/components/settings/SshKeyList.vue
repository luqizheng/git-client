<template>
  <div class="space-y-2">
    <div v-if="keys.length === 0" class="text-center py-8 text-gray-400">
      暂无 SSH 密钥
    </div>
    <ssh-key-item
      v-for="key in keys"
      :key="key.id"
      :ssh-key="key"
      :is-in-agent="loadedAgentKeys.includes(key.fingerprint)"
      @view="handleView"
      @copy="handleCopy"
      @delete="handleDelete"
      @add-to-agent="handleAddToAgent"
      @remove-from-agent="handleRemoveFromAgent"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { toast } from 'vue-sonner';
import SshKeyItem from './SshKeyItem.vue';
import type { SshKey } from '../../types/key';
import { sshKeyApi } from '../../utils/keys';

const props = defineProps<{
  keys: SshKey[];
}>();

const emit = defineEmits<{
  refresh: [];
}>();

const loadedAgentKeys = ref<string[]>([]);

async function loadAgentKeys() {
  try {
    const keys = await sshKeyApi.list();
    const fingerprints = await Promise.all(
      keys.map(async (k) => {
        try {
          const inAgent = await sshKeyApi.isInAgent(k.fingerprint);
          return inAgent ? k.fingerprint : null;
        } catch {
          return null;
        }
      })
    );
    loadedAgentKeys.value = fingerprints.filter(Boolean) as string[];
  } catch {
    // ignore
  }
}

async function handleView(key: SshKey) {
  try {
    const content = await sshKeyApi.getPublicKey(key.public_key_path);
    toast.info(`公钥: ${content.substring(0, 50)}...`);
  } catch (e) {
    toast.error(`获取公钥失败: ${e}`);
  }
}

async function handleCopy(key: SshKey) {
  try {
    const content = await sshKeyApi.getPublicKey(key.public_key_path);
    await navigator.clipboard.writeText(content);
    toast.success('公钥已复制到剪贴板');
  } catch (e) {
    toast.error(`复制失败: ${e}`);
  }
}

async function handleDelete(key: SshKey) {
  try {
    await sshKeyApi.delete(key.id);
    toast.success('密钥已删除');
    emit('refresh');
  } catch (e) {
    toast.error(`删除失败: ${e}`);
  }
}

async function handleAddToAgent(key: SshKey) {
  try {
    await sshKeyApi.addToAgent(key.private_key_path);
    toast.success('密钥已添加到 ssh-agent');
    await loadAgentKeys();
  } catch (e) {
    toast.error(`添加失败: ${e}`);
  }
}

async function handleRemoveFromAgent(key: SshKey) {
  try {
    await sshKeyApi.removeFromAgent(key.public_key_path);
    toast.success('密钥已从 ssh-agent 移除');
    await loadAgentKeys();
  } catch (e) {
    toast.error(`移除失败: ${e}`);
  }
}

onMounted(() => {
  loadAgentKeys();
});
</script>
