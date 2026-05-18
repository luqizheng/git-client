<template>
  <Dialog :open="showModal" @update:open="showModal = $event">
    <DialogContent class="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle>导入 SSH 密钥</DialogTitle>
      </DialogHeader>
      <div class="grid gap-4 py-4">
        <div class="grid grid-cols-4 items-center gap-4">
          <Label class="text-right">密钥名称</Label>
          <Input v-model="form.name" placeholder="例如: imported-key" class="col-span-3" />
        </div>
        <div class="grid grid-cols-4 items-start gap-4">
          <Label class="text-right pt-2">私钥文件</Label>
          <div class="col-span-3 space-y-2">
            <Input v-model="form.sourcePath" placeholder="/path/to/private/key" readonly />
            <Button variant="outline" @click="selectFile">选择文件</Button>
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" @click="showModal = false">取消</Button>
        <Button :disabled="loading" @click="handleImport">
          <span v-if="loading" class="mr-2">...</span>
          导入
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { open } from '@tauri-apps/plugin-dialog';
import { toast } from 'vue-sonner';
import { sshKeyApi } from '../../utils/keys';

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
    toast.warning('请输入密钥名称');
    return;
  }
  if (!form.value.sourcePath) {
    toast.warning('请选择私钥文件');
    return;
  }

  loading.value = true;
  try {
    await sshKeyApi.import(form.value.sourcePath, form.value.name);
    toast.success('密钥导入成功！');
    showModal.value = false;
    form.value = { name: '', sourcePath: '' };
    emit('success');
  } catch (e) {
    toast.error(`导入失败: ${e}`);
  } finally {
    loading.value = false;
  }
}
</script>
