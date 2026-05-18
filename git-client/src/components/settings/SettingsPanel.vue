<template>
  <Dialog :open="showDrawer" @update:open="showDrawer = $event">
    <DialogContent class="sm:max-w-[600px] h-[500px]">
      <DialogHeader>
        <DialogTitle>设置</DialogTitle>
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
            <h3 class="text-lg font-medium">通用设置</h3>
            <div class="grid grid-cols-4 items-center gap-4">
              <Label class="text-right">主题</Label>
              <Select v-model="theme" class="col-span-3">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dark">深色</SelectItem>
                  <SelectItem value="light">浅色</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="grid grid-cols-4 items-center gap-4">
              <Label class="text-right">语言</Label>
              <Select v-model="locale" class="col-span-3">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zh">中文</SelectItem>
                  <SelectItem value="en">English</SelectItem>
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
import SshKeyManager from './SshKeyManager.vue';
import GpgKeyManager from './GpgKeyManager.vue';
import { useAppStore } from '../../stores/app';

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

const tabs = [
  { key: 'general', label: '通用' },
  { key: 'ssh-keys', label: 'SSH 密钥' },
  { key: 'gpg-keys', label: 'GPG 密钥' },
];

const theme = computed({
  get: () => app.theme,
  set: (val) => (app.theme = val),
});

const locale = computed({
  get: () => app.locale,
  set: (val) => (app.locale = val),
});
</script>
