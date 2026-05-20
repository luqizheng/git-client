<template>
  <div class="space-y-2">
    <div v-if="keys.length === 0" class="text-center py-8 text-muted-foreground">
      {{ t('sshKeys.noKeys') }}
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
import { useI18n } from 'vue-i18n';
import SshKeyItem from './SshKeyItem.vue';
import type { SshKey } from '../../types/key';
import { sshKeyApi } from '../../utils/keys';

const { t } = useI18n();

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
    toast.info(`${t('sshKeys.actions.viewPublic')}: ${content.substring(0, 50)}...`);
  } catch (e) {
    toast.error(t('sshKeys.messages.loadFailed'));
  }
}

async function handleCopy(key: SshKey) {
  try {
    const content = await sshKeyApi.getPublicKey(key.public_key_path);
    await navigator.clipboard.writeText(content);
    toast.success(t('sshKeys.messages.copied'));
  } catch (e) {
    toast.error(t('sshKeys.messages.copyFailed'));
  }
}

async function handleDelete(key: SshKey) {
  try {
    await sshKeyApi.delete(key.id);
    toast.success(t('sshKeys.messages.deleteSuccess'));
    emit('refresh');
  } catch (e) {
    toast.error(t('sshKeys.messages.deleteFailed'));
  }
}

async function handleAddToAgent(key: SshKey) {
  try {
    await sshKeyApi.addToAgent(key.private_key_path);
    toast.success(t('sshKeys.messages.addToAgentSuccess'));
    await loadAgentKeys();
  } catch (e) {
    toast.error(t('sshKeys.messages.addToAgentFailed'));
  }
}

async function handleRemoveFromAgent(key: SshKey) {
  try {
    await sshKeyApi.removeFromAgent(key.public_key_path);
    toast.success(t('sshKeys.messages.removeFromAgentSuccess'));
    await loadAgentKeys();
  } catch (e) {
    toast.error(t('sshKeys.messages.removeFromAgentFailed'));
  }
}

onMounted(() => {
  loadAgentKeys();
});
</script>
