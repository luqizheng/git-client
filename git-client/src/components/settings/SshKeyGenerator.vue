<template>
  <Dialog :open="showModal" @update:open="showModal = $event">
    <DialogContent class="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle>生成新 SSH 密钥</DialogTitle>
      </DialogHeader>
      <div class="grid gap-4 py-4">
        <div class="grid grid-cols-4 items-center gap-4">
          <Label class="text-right">密钥名称</Label>
          <Input v-model="form.name" placeholder="例如: work-key" class="col-span-3" />
        </div>
        <div class="grid grid-cols-4 items-center gap-4">
          <Label class="text-right">算法</Label>
          <Select v-model="form.algorithm" class="col-span-3">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem :value="SshAlgorithm.Ed25519">Ed25519 (推荐)</SelectItem>
              <SelectItem :value="SshAlgorithm.Rsa">RSA 4096</SelectItem>
              <SelectItem :value="SshAlgorithm.Ecdsa">ECDSA</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="grid grid-cols-4 items-center gap-4">
          <Label class="text-right">注释 (可选)</Label>
          <Input v-model="form.comment" placeholder="例如: user@example.com" class="col-span-3" />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" @click="showModal = false">取消</Button>
        <Button :disabled="loading" @click="handleGenerate">
          <span v-if="loading" class="mr-2">...</span>
          生成
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
