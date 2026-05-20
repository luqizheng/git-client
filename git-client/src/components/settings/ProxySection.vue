<template>
  <div class="space-y-6">
    <h3 class="text-lg font-medium">{{ t('settings.tabs.proxy') }}</h3>

    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <Label>{{ t('settings.proxy.enable') }}</Label>
          <p class="text-xs text-muted-foreground">{{ t('settings.proxy.enableDesc') }}</p>
        </div>
        <Switch v-model="enabled" />
      </div>

      <template v-if="enabled">
        <div class="grid grid-cols-4 gap-4">
          <Label class="text-right col-span-1 pt-2">{{ t('settings.proxy.http') }}</Label>
          <Input v-model="httpProxy" class="col-span-3" placeholder="http://proxy:8080" />
        </div>

        <div class="grid grid-cols-4 gap-4">
          <Label class="text-right col-span-1 pt-2">{{ t('settings.proxy.https') }}</Label>
          <Input v-model="httpsProxy" class="col-span-3" placeholder="https://proxy:8443" />
        </div>

        <div class="grid grid-cols-4 gap-4">
          <Label class="text-right col-span-1 pt-2">{{ t('settings.proxy.noProxy') }}</Label>
          <Input v-model="noProxy" class="col-span-3" placeholder="localhost,127.0.0.1,.local" />
        </div>

        <Separator />

        <h4 class="text-sm font-medium text-muted-foreground">{{ t('settings.proxy.auth') }}</h4>
        <div class="grid grid-cols-4 gap-4">
          <Label class="text-right col-span-1 pt-2">{{ t('settings.proxy.username') }}</Label>
          <Input v-model="proxyUsername" class="col-span-3" placeholder="username" />
        </div>

        <div class="grid grid-cols-4 gap-4">
          <Label class="text-right col-span-1 pt-2">{{ t('settings.proxy.password') }}</Label>
          <Input v-model="proxyPassword" type="password" class="col-span-3" placeholder="••••••••" />
        </div>
      </template>
    </div>

    <div class="flex justify-end gap-2">
      <Button @click="saveProxy" :disabled="saving">
        {{ saving ? t('common.saving') : t('common.save') }}
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { invoke } from '@/utils/ipc'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { toast } from 'vue-sonner'

const { t } = useI18n()
const saving = ref(false)

const enabled = ref(false)
const httpProxy = ref('')
const httpsProxy = ref('')
const noProxy = ref('')
const proxyUsername = ref('')
const proxyPassword = ref('')

async function loadProxy() {
  try {
    const config = await invoke<Record<string, string>>('get_git_config', { scope: 'global' })
    httpProxy.value = config['http.proxy'] || ''
    httpsProxy.value = config['https.proxy'] || ''
    enabled.value = !!(httpProxy.value || httpsProxy.value)
  } catch (e) {
    console.error('loadProxy error:', e)
  }
}

async function saveProxy() {
  saving.value = true
  try {
    const config: Record<string, string> = {}
    
    if (enabled.value) {
      if (httpProxy.value) config['http.proxy'] = httpProxy.value
      if (httpsProxy.value) config['https.proxy'] = httpsProxy.value
      if (noProxy.value) config['no_proxy'] = noProxy.value
      if (proxyUsername.value) {
        const proxyUrl = new URL(httpProxy.value || httpsProxy.value)
        proxyUrl.username = proxyUsername.value
        if (proxyPassword.value) proxyUrl.password = proxyPassword.value
        config['http.proxy'] = proxyUrl.toString()
      }
    } else {
      config['http.proxy'] = ''
      config['https.proxy'] = ''
    }

    await invoke('set_git_config', { config, scope: 'global' })
    toast.success(t('common.saved'))
  } catch (e) {
    toast.error(String(e))
  } finally {
    saving.value = false
  }
}

loadProxy()
</script>
