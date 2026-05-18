<template>
  <n-modal v-model:show="showModal" preset="card" title="导入 SSH 密钥" style="width: 500px">
    <n-form label-placement="left" label-width="100">
      <n-form-item label="密钥名称">
        <n-input v-model:value="form.name" placeholder="例如: imported-key" />
      </n-form-item>
      <n-form-item label="私钥文件">
        <n-input v-model:value="form.sourcePath" placeholder="/path/to/private/key" readonly />
        <n-button class="mt-2" @click="selectFile">选择文件</n-button>
      </n-form-item>
    </n-form>
    <template #footer>
      <div class="flex justify-end gap-2">
        <n-button @click="showModal = false">取消</n-button>
        <n-button type="primary" :loading="loading" @click="handleImport">导入</n-button>
      </div>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { NModal, NForm, NFormItem, NInput, NButton, useMessage } from 'naive-ui';
import { open } from '@tauri-apps/plugin-dialog';
import { sshKeyApi } from '../../utils/keys';

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  success: [];
}>();

const message = useMessage();
const loading = ref(false);
const form = ref({
  name: '',
  sourcePath: '',
});

const showModal = ref(false);

watch(() => props.modelValue, (val) => {
  showModal.value = val;
});

watch(showModal, (val) => {
  emit('update:modelValue', val);
});

async function selectFile() {
  try {
    const selected = await open({
      multiple: false,
      filters: [{ name: 'Private Key', extensions: ['pem', 'key', 'ppk', ''] }],
    });
    if (selected) {
      form.value.sourcePath = selected as string;
      if (!form.value.name) {
        const filename = (selected as string).split(/[/\\]/).pop() || '';
        form.value.name = filename.replace(/\.[^.]+$/, '');
      }
    }
  } catch {
    // ignore
  }
}

async function handleImport() {
  if (!form.value.name.trim()) {
    message.warning('请输入密钥名称');
    return;
  }
  if (!form.value.sourcePath) {
    message.warning('请选择私钥文件');
    return;
  }

  loading.value = true;
  try {
    await sshKeyApi.import(form.value.sourcePath, form.value.name);
    message.success('密钥导入成功！');
    showModal.value = false;
    form.value = { name: '', sourcePath: '' };
    emit('success');
  } catch (e) {
    message.error(`导入失败: ${e}`);
  } finally {
    loading.value = false;
  }
}
</script>
