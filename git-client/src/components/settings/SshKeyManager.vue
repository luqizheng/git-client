<template>
  <div class="space-y-4">
    <div class="flex justify-between items-center">
      <h3 class="text-lg font-medium">SSH 密钥</h3>
      <div class="flex gap-2">
        <n-button type="primary" @click="showGenerator = true">
          <template #icon>
            <PlusIcon />
          </template>
          生成新密钥
        </n-button>
        <n-button @click="showImporter = true">
          <template #icon>
            <UploadIcon />
          </template>
          导入密钥
        </n-button>
      </div>
    </div>

    <ssh-key-list :keys="keys" @refresh="loadKeys" />

    <ssh-key-generator v-model="showGenerator" @success="loadKeys" />
    <ssh-key-import v-model="showImporter" @success="loadKeys" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { NButton } from 'naive-ui';
import { Add as PlusIcon, CloudUpload as UploadIcon } from '@vicons/ionicons5';
import { toast } from 'vue-sonner';
import SshKeyList from './SshKeyList.vue';
import SshKeyGenerator from './SshKeyGenerator.vue';
import SshKeyImport from './SshKeyImport.vue';
import type { SshKey } from '../../types/key';
import { sshKeyApi } from '../../utils/keys';

const keys = ref<SshKey[]>([]);
const showGenerator = ref(false);
const showImporter = ref(false);

async function loadKeys() {
  try {
    keys.value = await sshKeyApi.list();
  } catch (e) {
    toast.error(`加载密钥失败: ${e}`);
  }
}

onMounted(() => {
  loadKeys();
});
</script>
