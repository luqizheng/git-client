<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-medium">{{ t('settings.tabs.gitConfig') }}</h3>
      <div class="flex items-center gap-2">
        <Select v-model="scope" class="w-32">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="global">{{ t('settings.gitConfig.scopeGlobal') }}</SelectItem>
            <SelectItem value="local">{{ t('settings.gitConfig.scopeLocal') }}</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" @click="loadConfig">{{ t('common.refresh') }}</Button>
      </div>
    </div>

    <div class="space-y-4">
      <div class="grid grid-cols-4 gap-4">
        <Label class="text-right col-span-1 pt-2">{{ t('settings.gitConfig.userName') }}</Label>
        <Input v-model="userName" class="col-span-3" :placeholder="t('settings.gitConfig.userNamePlaceholder')" />
      </div>

      <div class="grid grid-cols-4 gap-4">
        <Label class="text-right col-span-1 pt-2">{{ t('settings.gitConfig.userEmail') }}</Label>
        <Input v-model="userEmail" class="col-span-3" type="email" :placeholder="t('settings.gitConfig.userEmailPlaceholder')" />
      </div>

      <div class="grid grid-cols-4 gap-4">
        <Label class="text-right col-span-1 pt-2">{{ t('settings.gitConfig.defaultBranch') }}</Label>
        <Input v-model="defaultBranch" class="col-span-3" placeholder="main" />
      </div>

      <div class="grid grid-cols-4 gap-4">
        <Label class="text-right col-span-1 pt-2">{{ t('settings.gitConfig.autocrlf') }}</Label>
        <Select v-model="autocrlf" class="col-span-3 w-40">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">{{ t('settings.gitConfig.autocrlfTrue') }}</SelectItem>
            <SelectItem value="false">{{ t('settings.gitConfig.autocrlfFalse') }}</SelectItem>
            <SelectItem value="input">{{ t('settings.gitConfig.autocrlfInput') }}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div class="grid grid-cols-4 gap-4">
        <Label class="text-right col-span-1 pt-2">{{ t('settings.gitConfig.pullRebase') }}</Label>
        <Select v-model="pullRebase" class="col-span-3 w-32">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">true</SelectItem>
            <SelectItem value="false">false</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>

    <Separator />

    <div class="flex items-center justify-between">
      <div>
        <h4 class="text-sm font-medium">{{ t('settings.gitConfig.credentialHelper') }}</h4>
        <p class="text-xs text-muted-foreground">{{ t('settings.gitConfig.credentialHelperDesc') }}</p>
      </div>
      <Select v-model="credentialHelper" class="w-40">
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">{{ t('settings.gitConfig.none') }}</SelectItem>
          <SelectItem value="manager">Manager</SelectItem>
          <SelectItem value="store">Store</SelectItem>
          <SelectItem value="cache">Cache</SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div class="flex justify-end gap-2">
      <Button variant="outline" @click="resetConfig">{{ t('common.reset') }}</Button>
      <Button @click="saveConfig" :disabled="saving">
        {{ saving ? t('common.saving') : t('common.save') }}
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { invoke } from '@/utils/ipc'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { toast } from 'vue-sonner'

const { t } = useI18n()

const scope = ref<'global' | 'local'>('global')
const saving = ref(false)

const userName = ref('')
const userEmail = ref('')
const defaultBranch = ref('main')
const autocrlf = ref('true')
const pullRebase = ref('false')
const credentialHelper = ref('')

async function loadConfig() {
  try {
    const config = await invoke<Record<string, string>>('get_git_config', { scope: scope.value })
    userName.value = config['user.name'] || ''
    userEmail.value = config['user.email'] || ''
    defaultBranch.value = config['init.defaultBranch'] || 'main'
    autocrlf.value = config['core.autocrlf'] || 'true'
    pullRebase.value = config['pull.rebase'] || 'false'
    credentialHelper.value = config['credential.helper'] || ''
  } catch (e) {
    toast.error(String(e))
  }
}

async function saveConfig() {
  saving.value = true
  try {
    const config: Record<string, string> = {}
    if (userName.value) config['user.name'] = userName.value
    if (userEmail.value) config['user.email'] = userEmail.value
    if (defaultBranch.value) config['init.defaultBranch'] = defaultBranch.value
    if (autocrlf.value) config['core.autocrlf'] = autocrlf.value
    if (pullRebase.value) config['pull.rebase'] = pullRebase.value
    if (credentialHelper.value) config['credential.helper'] = credentialHelper.value

    await invoke('set_git_config', { scope: scope.value, config })
    toast.success(t('settings.gitConfig.saved'))
  } catch (e) {
    toast.error(String(e))
  } finally {
    saving.value = false
  }
}

function resetConfig() {
  userName.value = ''
  userEmail.value = ''
  defaultBranch.value = 'main'
  autocrlf.value = 'true'
  pullRebase.value = 'false'
  credentialHelper.value = ''
}

onMounted(loadConfig)
</script>
