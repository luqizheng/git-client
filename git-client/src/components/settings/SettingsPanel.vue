<template>
  <Dialog :open="showDrawer" @update:open="showDrawer = $event">
    <DialogContent class="sm:max-w-[600px] h-[500px]">
      <DialogHeader>
        <DialogTitle>{{ t('settings.title') }}</DialogTitle>
      </DialogHeader>
      <div class="flex gap-4 h-full">
        <div class="w-28 border-r pr-2">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            class="w-full text-left px-3 py-2 text-sm rounded transition-colors"
            :class="activeTab === tab.key ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'"
            @click="activeTab = tab.key"
          >
            {{ tab.label }}
          </button>
        </div>
        <div class="flex-1 overflow-auto">
          <div v-if="activeTab === 'general'" class="p-4 space-y-4">
            <h3 class="text-lg font-medium">{{ t('settings.tabs.general') }}</h3>
            <div class="grid grid-cols-4 items-center gap-4">
              <Label class="text-right">{{ t('settings.theme') }}</Label>
              <Select v-model="theme" class="col-span-3">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dark">{{ t('settings.themes.dark') }}</SelectItem>
                  <SelectItem value="light">{{ t('settings.themes.light') }}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="grid grid-cols-4 items-center gap-4">
              <Label class="text-right">{{ t('settings.language') }}</Label>
              <Select v-model="locale" class="col-span-3">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zh">{{ t('settings.languages.zh') }}</SelectItem>
                  <SelectItem value="en">{{ t('settings.languages.en') }}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div v-else-if="activeTab === 'ssh-keys'" class="p-4">
            <ssh-key-manager />
          </div>
          <div v-else-if="activeTab === 'gpg-keys'" class="p-4">
            <gpg-key-manager />
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useI18n } from 'vue-i18n';
import SshKeyManager from './SshKeyManager.vue';
import GpgKeyManager from './GpgKeyManager.vue';
import { useAppStore } from '../../stores/app';

const { t } = useI18n();

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const app = useAppStore();

const showDrawer = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
});

const activeTab = ref('general');

const tabs = computed(() => [
  { key: 'general', label: t('settings.tabs.general') },
  { key: 'ssh-keys', label: t('settings.tabs.sshKeys') },
  { key: 'gpg-keys', label: t('settings.tabs.gpgKeys') },
]);

const theme = computed({
  get: () => app.theme,
  set: (val) => (app.theme = val),
});

const locale = computed({
  get: () => app.locale,
  set: (val) => (app.locale = val),
});
</script>
