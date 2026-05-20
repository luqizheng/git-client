<template>
  <div class="space-y-6">
    <h3 class="text-lg font-medium">{{ t('settings.tabs.general') }}</h3>
    
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <Label>{{ t('settings.theme') }}</Label>
          <p class="text-xs text-muted-foreground">{{ t('settings.themeDesc') }}</p>
        </div>
        <Select v-model="theme" class="w-40">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="system">{{ t('settings.themes.system') }}</SelectItem>
            <SelectItem value="dark">{{ t('settings.themes.dark') }}</SelectItem>
            <SelectItem value="light">{{ t('settings.themes.light') }}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div class="flex items-center justify-between">
        <div>
          <Label>{{ t('settings.language') }}</Label>
          <p class="text-xs text-muted-foreground">{{ t('settings.languageDesc') }}</p>
        </div>
        <Select v-model="locale" class="w-40">
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

    <Separator />

    <h4 class="text-sm font-medium text-muted-foreground">{{ t('settings.behavior.title') }}</h4>
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <Label>{{ t('settings.behavior.startup') }}</Label>
          <p class="text-xs text-muted-foreground">{{ t('settings.behavior.startupDesc') }}</p>
        </div>
        <Select v-model="startupAction" class="w-48">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="welcome">{{ t('settings.behavior.startupWelcome') }}</SelectItem>
            <SelectItem value="lastRepo">{{ t('settings.behavior.startupLastRepo') }}</SelectItem>
            <SelectItem value="nothing">{{ t('settings.behavior.startupNothing') }}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div class="flex items-center justify-between">
        <div>
          <Label>{{ t('settings.behavior.autoFetch') }}</Label>
          <p class="text-xs text-muted-foreground">{{ t('settings.behavior.autoFetchDesc') }}</p>
        </div>
        <Select v-model="autoFetchInterval" class="w-32">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">{{ t('settings.behavior.autoFetchDisabled') }}</SelectItem>
            <SelectItem value="30">30s</SelectItem>
            <SelectItem value="60">1min</SelectItem>
            <SelectItem value="300">5min</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>

    <Separator />

    <h4 class="text-sm font-medium text-muted-foreground">{{ t('settings.confirm.title') }}</h4>
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <Label>{{ t('settings.confirm.forcePush') }}</Label>
        <Switch v-model="confirmForcePush" />
      </div>
      <div class="flex items-center justify-between">
        <Label>{{ t('settings.confirm.discard') }}</Label>
        <Switch v-model="confirmDiscard" />
      </div>
      <div class="flex items-center justify-between">
        <Label>{{ t('settings.confirm.reset') }}</Label>
        <Switch v-model="confirmReset" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { useAppStore } from '@/stores/app'

const { t } = useI18n()
const app = useAppStore()

const theme = computed({
  get: () => app.theme,
  set: (val) => (app.theme = val)
})

const locale = computed({
  get: () => app.locale,
  set: (val) => (app.locale = val)
})

const startupAction = computed({
  get: () => app.settings?.startupAction || 'welcome',
  set: (val) => {
    if (app.settings) app.settings.startupAction = val
  }
})

const autoFetchInterval = computed({
  get: () => String(app.settings?.autoFetchInterval ?? 60),
  set: (val) => {
    if (app.settings) app.settings.autoFetchInterval = Number(val)
  }
})

const confirmForcePush = computed({
  get: () => app.settings?.confirmForcePush ?? true,
  set: (val) => {
    if (app.settings) app.settings.confirmForcePush = val
  }
})

const confirmDiscard = computed({
  get: () => app.settings?.confirmDiscard ?? true,
  set: (val) => {
    if (app.settings) app.settings.confirmDiscard = val
  }
})

const confirmReset = computed({
  get: () => app.settings?.confirmReset ?? true,
  set: (val) => {
    if (app.settings) app.settings.confirmReset = val
  }
})
</script>
