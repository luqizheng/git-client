<template>
  <Dialog :open="showModal" @update:open="showModal = $event">
    <DialogContent class="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle>{{ t('sshKeys.import') }}</DialogTitle>
      </DialogHeader>
      <div class="grid gap-4 py-4">
        <div class="grid grid-cols-4 items-center gap-4">
          <Label class="text-right">{{ t('sshKeys.name') }}</Label>
          <Input v-model="form.name" :placeholder="t('sshKeys.namePlaceholder')" class="col-span-3" />
        </div>
        <div class="grid grid-cols-4 items-start gap-4">
          <Label class="text-right pt-2">{{ t('sshKeys.privateKeyFile') }}</Label>
          <div class="col-span-3 space-y-2">
            <Input v-model="form.sourcePath" placeholder="/path/to/private/key" readonly />
            <Button variant="outline" @click="selectFile">{{ t('sshKeys.actions.selectFile') }}</Button>
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" @click="showModal = false">{{ t('sshKeys.actions.cancel') }}</Button>
        <Button :disabled="loading" @click="handleImport">
          <span v-if="loading" class="mr-2">...</span>
          {{ t('sshKeys.import') }}
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
import { useI18n } from 'vue-i18n';
import { sshKeyApi } from '../../utils/keys';

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
    toast.warning(t('sshKeys.messages.enterName'));
    return;
  }
  if (!form.value.sourcePath) {
    toast.warning(t('sshKeys.messages.selectKeyFile'));
    return;
  }

  loading.value = true;
  try {
    await sshKeyApi.import(form.value.sourcePath, form.value.name);
    toast.success(t('sshKeys.messages.importSuccess'));
    showModal.value = false;
    form.value = { name: '', sourcePath: '' };
    emit('success');
  } catch (e) {
    toast.error(t('sshKeys.messages.importFailed'));
  } finally {
    loading.value = false;
  }
}
</script>
