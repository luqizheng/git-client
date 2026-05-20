<template>
  <div class="space-y-2">
    <div v-if="keys.length === 0" class="text-center py-8 text-muted-foreground">
      {{ t('gpgKeys.noKeys') }}
    </div>
    <gpg-key-item v-for="k in keys" :key="k.fingerprint" :gpg-key="k" @export="handleExport" @delete="handleDelete" />
  </div>
</template>

<script setup lang="ts">
import { toast } from 'vue-sonner';
import { useI18n } from 'vue-i18n';
import GpgKeyItem from './GpgKeyItem.vue';
import type { GpgKey } from '../../types/key';
import { gpgKeyApi } from '../../utils/keys';

const { t } = useI18n();

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
    toast.success(t('gpgKeys.messages.exportSuccess'));
  } catch (e) {
    toast.error(t('gpgKeys.messages.exportFailed'));
  }
}

async function handleDelete(key: GpgKey) {
  try {
    await gpgKeyApi.delete(key.id);
    toast.success('Key deleted');
    emit('refresh');
  } catch (e) {
    toast.error(t('gpgKeys.messages.deleteFailed'));
  }
}
</script>
