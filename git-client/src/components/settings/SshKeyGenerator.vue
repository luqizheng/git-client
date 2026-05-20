<template>
  <Dialog :open="showModal" @update:open="showModal = $event">
    <DialogContent class="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle>{{ t('sshKeys.generate') }}</DialogTitle>
      </DialogHeader>
      <div class="grid gap-4 py-4">
        <div class="grid grid-cols-4 items-center gap-4">
          <Label class="text-right">{{ t('sshKeys.name') }}</Label>
          <Input v-model="form.name" :placeholder="t('sshKeys.namePlaceholder')" class="col-span-3" />
        </div>
        <div class="grid grid-cols-4 items-center gap-4">
          <Label class="text-right">{{ t('sshKeys.algorithm.label') }}</Label>
          <Select v-model="form.algorithm" class="col-span-3">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem :value="SshAlgorithm.Ed25519">{{ t('sshKeys.algorithm.ed25519') }}</SelectItem>
              <SelectItem :value="SshAlgorithm.Rsa">{{ t('sshKeys.algorithm.rsa') }}</SelectItem>
              <SelectItem :value="SshAlgorithm.Ecdsa">{{ t('sshKeys.algorithm.ecdsa') }}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="grid grid-cols-4 items-center gap-4">
          <Label class="text-right">{{ t('sshKeys.comment') }}</Label>
          <Input v-model="form.comment" :placeholder="t('sshKeys.commentPlaceholder')" class="col-span-3" />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" @click="showModal = false">{{ t('sshKeys.actions.cancel') }}</Button>
        <Button :disabled="loading" @click="handleGenerate">
          <span v-if="loading" class="mr-2">...</span>
          {{ t('sshKeys.actions.generate') }}
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
import { useI18n } from 'vue-i18n';
import { sshKeyApi } from '../../utils/keys';
import { SshAlgorithm } from '../../types/key';

const { t } = useI18n();

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
    toast.warning(t('sshKeys.messages.enterName'));
    return;
  }

  loading.value = true;
  try {
    await sshKeyApi.generate(
      form.value.name,
      form.value.algorithm,
      form.value.comment || undefined
    );
    toast.success(t('sshKeys.messages.generateSuccess'));
    showModal.value = false;
    form.value = { name: '', algorithm: SshAlgorithm.Ed25519, comment: '' };
    emit('success');
  } catch (e) {
    toast.error(t('sshKeys.messages.generateFailed'));
  } finally {
    loading.value = false;
  }
}
</script>
