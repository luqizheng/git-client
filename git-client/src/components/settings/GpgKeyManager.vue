<template>
  <div class="space-y-4">
    <div class="flex justify-between items-center">
      <h3 class="text-lg font-medium">GPG 密钥</h3>
      <div v-if="!isGpgAvailable" class="text-accent-yellow text-sm">
        GPG 未安装，请先安装 GPG 工具
      </div>
    </div>

    <gpg-key-list :keys="keys" @refresh="loadKeys" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { toast } from 'vue-sonner';
import GpgKeyList from './GpgKeyList.vue';
import type { GpgKey } from '../../types/key';
import { gpgKeyApi } from '../../utils/keys';

const keys = ref<GpgKey[]>([]);
const isGpgAvailable = ref(true);

async function loadKeys() {
  try {
    keys.value = await gpgKeyApi.list();
    isGpgAvailable.value = true;
  } catch (e) {
    isGpgAvailable.value = false;
    toast.warning('无法加载 GPG 密钥，可能未安装 GPG');
  }
}

onMounted(() => {
  loadKeys();
});
</script>
