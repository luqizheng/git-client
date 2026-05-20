<template>
  <Dialog :open="showDrawer" @update:open="showDrawer = $event">
    <DialogContent class="sm:max-w-[700px] max-h-[600px] flex flex-col">
      <DialogHeader>
        <DialogTitle>{{ t('settings.title') }}</DialogTitle>
      </DialogHeader>
      <div class="flex flex-1 min-h-0">
        <nav class="w-44 border-r pr-3 space-y-1 shrink-0">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            class="w-full text-left px-3 py-2 text-sm rounded transition-colors flex items-center gap-2"
            :class="activeTab === tab.key ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'"
            @click="activeTab = tab.key"
          >
            <component :is="tab.icon" class="w-4 h-4 shrink-0" />
            {{ tab.label }}
          </button>
        </nav>
        <div class="flex-1 overflow-y-auto pl-4">
          <GeneralSettings v-if="activeTab === 'general'" />
          <GitConfigSection v-else-if="activeTab === 'git-config'" />
          <ProxySection v-else-if="activeTab === 'proxy'" />
          <EditorSection v-else-if="activeTab === 'editor'" />
          <ShortcutsSection v-else-if="activeTab === 'shortcuts'" />
          <HooksSection v-else-if="activeTab === 'hooks'" />
          <SshKeyManager v-else-if="activeTab === 'ssh-keys'" />
          <GpgKeyManager v-else-if="activeTab === 'gpg-keys'" />
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref, h } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useI18n } from 'vue-i18n'
import GeneralSettings from './GeneralSettings.vue'
import GitConfigSection from './GitConfigSection.vue'
import ProxySection from './ProxySection.vue'
import EditorSection from './EditorSection.vue'
import ShortcutsSection from './ShortcutsSection.vue'
import HooksSection from './HooksSection.vue'
import SshKeyManager from './SshKeyManager.vue'
import GpgKeyManager from './GpgKeyManager.vue'

const { t } = useI18n()

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const showDrawer = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const activeTab = ref('general')

const CogIcon = () => h('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
  h('path', { d: 'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z' }),
  h('circle', { cx: '12', cy: '12', r: '3' })
])

const GitIcon = () => h('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
  h('circle', { cx: '12', cy: '12', r: '3' }),
  h('line', { x1: '3', y1: '12', x2: '9', y2: '12' }),
  h('line', { x1: '15', y1: '12', x2: '21', y2: '12' })
])

const ProxyIcon = () => h('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
  h('rect', { x: '2', y: '2', width: '20', height: '8', rx: '2', ry: '2' }),
  h('rect', { x: '2', y: '14', width: '20', height: '8', rx: '2', ry: '2' }),
  h('line', { x1: '6', y1: '6', x2: '6.01', y2: '6' }),
  h('line', { x1: '6', y1: '18', x2: '6.01', y2: '18' })
])

const EditorIcon = () => h('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
  h('path', { d: 'M12 20h9' }),
  h('path', { d: 'M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z' })
])

const KeyboardIcon = () => h('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
  h('rect', { x: '2', y: '4', width: '20', height: '16', rx: '2', ry: '2' }),
  h('line', { x1: '6', y1: '8', x2: '6.01', y2: '8' }),
  h('line', { x1: '10', y1: '8', x2: '10.01', y2: '8' }),
  h('line', { x1: '14', y1: '8', x2: '14.01', y2: '8' }),
  h('line', { x1: '18', y1: '8', x2: '18.01', y2: '8' }),
  h('line', { x1: '6', y1: '12', x2: '6.01', y2: '12' }),
  h('line', { x1: '18', y1: '12', x2: '18.01', y2: '12' }),
  h('line', { x1: '8', y1: '16', x2: '16', y2: '16' })
])

const HookIcon = () => h('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
  h('path', { d: 'M18 2l4 4' }),
  h('path', { d: 'M17.1 12.9a5.5 5.5 0 1 0 0 5.2' }),
  h('path', { d: 'M9.9 4.2A5.5 5.5 0 1 0 15 9.4' }),
  h('path', { d: 'M3 7l3 3 3-3' })
])

const KeyIcon = () => h('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
  h('path', { d: 'm21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4' })
])

const ShieldIcon = () => h('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
  h('path', { d: 'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z' })
])

const tabs = computed(() => [
  { key: 'general', label: t('settings.tabs.general'), icon: CogIcon },
  { key: 'git-config', label: t('settings.tabs.gitConfig'), icon: GitIcon },
  { key: 'proxy', label: t('settings.tabs.proxy'), icon: ProxyIcon },
  { key: 'editor', label: t('settings.tabs.editor'), icon: EditorIcon },
  { key: 'shortcuts', label: t('settings.tabs.shortcuts'), icon: KeyboardIcon },
  { key: 'hooks', label: t('settings.tabs.hooks'), icon: HookIcon },
  { key: 'ssh-keys', label: t('settings.tabs.sshKeys'), icon: KeyIcon },
  { key: 'gpg-keys', label: t('settings.tabs.gpgKeys'), icon: ShieldIcon },
])
</script>
