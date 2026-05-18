<template>
  <n-drawer v-model:show="showDrawer" :width="600" placement="right">
    <n-drawer-content title="设置">
      <n-tabs type="line" placement="left" tab-style="min-width: 120px">
        <n-tab-pane name="general" tab="通用">
          <div class="p-4">
            <h3 class="text-lg font-medium mb-4">通用设置</h3>
            <n-form label-placement="left" label-width="100">
              <n-form-item label="主题">
                <n-select v-model:value="theme" :options="themeOptions" />
              </n-form-item>
              <n-form-item label="语言">
                <n-select v-model:value="locale" :options="localeOptions" />
              </n-form-item>
            </n-form>
          </div>
        </n-tab-pane>
        <n-tab-pane name="ssh-keys" tab="SSH 密钥">
          <div class="p-4">
            <ssh-key-manager />
          </div>
        </n-tab-pane>
        <n-tab-pane name="gpg-keys" tab="GPG 密钥">
          <div class="p-4">
            <gpg-key-manager />
          </div>
        </n-tab-pane>
      </n-tabs>
    </n-drawer-content>
  </n-drawer>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { NDrawer, NDrawerContent, NTabs, NTabPane, NForm, NFormItem, NSelect } from 'naive-ui';
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

const theme = computed({
  get: () => app.theme,
  set: (val) => (app.theme = val),
});

const locale = computed({
  get: () => app.locale,
  set: (val) => (app.locale = val),
});

const themeOptions = [
  { label: '深色', value: 'dark' },
  { label: '浅色', value: 'light' },
];

const localeOptions = [
  { label: '中文', value: 'zh' },
  { label: 'English', value: 'en' },
];
</script>
