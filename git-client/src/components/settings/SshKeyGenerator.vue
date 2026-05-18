<template>
  <n-modal v-model:show="showModal" preset="card" title="生成新 SSH 密钥" style="width: 500px">
    <n-form label-placement="left" label-width="100">
      <n-form-item label="密钥名称">
        <n-input v-model:value="form.name" placeholder="例如: work-key" />
      </n-form-item>
      <n-form-item label="算法">
        <n-select v-model:value="form.algorithm" :options="algorithmOptions" />
      </n-form-item>
      <n-form-item label="注释 (可选)">
        <n-input v-model:value="form.comment" placeholder="例如: user@example.com" />
      </n-form-item>
    </n-form>
    <template #footer>
      <div class="flex justify-end gap-2">
        <n-button @click="showModal = false">取消</n-button>
        <n-button type="primary" :loading="loading" @click="handleGenerate">生成</n-button>
      </div>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { NModal, NForm, NFormItem, NInput, NSelect, NButton } from 'naive-ui';
import { toast } from 'vue-sonner';
import { sshKeyApi } from '../../utils/keys';
import { SshAlgorithm } from '../../types/key';

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  success: [];
}>();

const loading = ref(false);
const form = ref({
  name: '',
  algorithm: SshAlgorithm.Ed25519,
  comment: '',
});

const showModal = ref(false);
const algorithmOptions = [
  { label: 'Ed25519 (推荐)', value: SshAlgorithm.Ed25519 },
  { label: 'RSA 4096', value: SshAlgorithm.Rsa },
  { label: 'ECDSA', value: SshAlgorithm.Ecdsa },
];

watch(() => props.modelValue, (val) => {
  showModal.value = val;
});

watch(showModal, (val) => {
  emit('update:modelValue', val);
});

async function handleGenerate() {
  if (!form.value.name.trim()) {
    toast.warning('请输入密钥名称');
    return;
  }

  loading.value = true;
  try {
    await sshKeyApi.generate(
      form.value.name,
      form.value.algorithm,
      form.value.comment || undefined
    );
    toast.success('密钥生成成功！请记得备份私钥。');
    showModal.value = false;
    form.value = { name: '', algorithm: SshAlgorithm.Ed25519, comment: '' };
    emit('success');
  } catch (e) {
    toast.error(`生成失败: ${e}`);
  } finally {
    loading.value = false;
  }
}
</script>
