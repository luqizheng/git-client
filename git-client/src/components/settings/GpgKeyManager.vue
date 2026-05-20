<template>
  <div class="space-y-4">
    <div class="flex justify-between items-center">
      <h3 class="text-lg font-medium">{{ t('gpgKeys.title') }}</h3>
      <div v-if="!isGpgAvailable" class="text-accent-yellow text-sm">
        {{ t('gpgKeys.notInstalled') }}
      </div>
    </div>

    <gpg-key-list :keys="keys" @refresh="loadKeys" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { toast } from 'vue-sonner';
import { useI18n } from 'vue-i18n';
import GpgKeyList from './GpgKeyList.vue';
import type { GpgKey } from '../../types/key';
import { gpgKeyApi } from '../../utils/keys';

const { t } = useI18n();

const keys = ref<GpgKey[]>([]);
const isGpgAvailable = ref(true);

async function loadKeys() {
  try {
    keys.value = await gpgKeyApi.list();
    isGpgAvailable.value = true;
  } catch (e) {
    isGpgAvailable.value = false;
    toast.warning(t('gpgKeys.messages.loadFailed'));
  }
}

onMounted(() => {
  loadKeys();
});
</script>
