<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-medium">{{ t('settings.tabs.hooks') }}</h3>
      <Button size="sm" @click="loadHooks">{{ t('common.refresh') }}</Button>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-8">
      <div class="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
    </div>

    <div v-else-if="hooks.length === 0" class="text-center py-8 text-muted-foreground">
      <p>{{ t('settings.hooks.noHooks') }}</p>
      <p class="text-xs mt-2">{{ t('settings.hooks.noHooksDesc') }}</p>
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="hook in hooks"
        :key="hook.name"
        class="flex items-center justify-between p-3 rounded-md border border-border hover:bg-muted/50"
      >
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2">
            <Switch v-model="hook.enabled" @update:checked="toggleHook(hook)" />
            <span class="text-sm font-medium">{{ hook.name }}</span>
          </div>
          <span class="text-xs text-muted-foreground">{{ t(`settings.hooks.${hook.name}`) || '' }}</span>
        </div>
        <div class="flex items-center gap-2">
          <Button size="sm" variant="ghost" @click="editHook(hook)">
            {{ t('settings.hooks.edit') }}
          </Button>
        </div>
      </div>
    </div>

    <Dialog v-model:open="showEditor">
      <DialogContent class="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{{ editingHook?.name }}</DialogTitle>
        </DialogHeader>
        <div class="space-y-4">
          <div>
            <Label>{{ t('settings.hooks.content') }}</Label>
            <Textarea
              v-model="hookContent"
              class="font-mono text-sm h-[300px] mt-2"
              :placeholder="t('settings.hooks.placeholder')"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="showEditor = false">{{ t('common.cancel') }}</Button>
          <Button @click="saveHook">{{ t('common.save') }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { invoke } from '@/utils/ipc'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'vue-sonner'

const { t } = useI18n()

interface Hook {
  name: string
  enabled: boolean
  path: string
}

const loading = ref(false)
const hooks = ref<Hook[]>([])
const showEditor = ref(false)
const editingHook = ref<Hook | null>(null)
const hookContent = ref('')

const allHooks = ['pre-commit', 'prepare-commit-msg', 'commit-msg', 'post-commit', 'pre-push', 'post-push']

async function loadHooks() {
  loading.value = true
  try {
    const repoPath = ''
    const hookList = await invoke<string[]>('list_hooks', { repoPath })
    hooks.value = allHooks.map(name => ({
      name,
      enabled: hookList.includes(name),
      path: `.git/hooks/${name}`,
    }))
  } catch (e) {
    console.error('loadHooks error:', e)
    hooks.value = allHooks.map(name => ({
      name,
      enabled: false,
      path: `.git/hooks/${name}`,
    }))
  } finally {
    loading.value = false
  }
}

function editHook(hook: Hook) {
  editingHook.value = hook
  loadHookContent(hook.name)
  showEditor.value = true
}

async function loadHookContent(name: string) {
  try {
    hookContent.value = await invoke<string>('get_hook_content', { repoPath: '', hookName: name })
  } catch {
    hookContent.value = ''
  }
}

async function saveHook() {
  if (!editingHook.value) return
  try {
    await invoke('set_hook_content', {
      repoPath: '',
      hookName: editingHook.value.name,
      content: hookContent.value,
    })
    toast.success(t('common.saved'))
    showEditor.value = false
  } catch (e) {
    toast.error(String(e))
  }
}

async function toggleHook(hook: Hook) {
  if (hook.enabled) {
    hookContent.value = '#!/bin/sh\n\n'
    await saveHook()
  } else {
    try {
      await invoke('set_hook_content', { repoPath: '', hookName: hook.name, content: '' })
    } catch (e) {
      console.error('toggleHook error:', e)
    }
  }
}

onMounted(loadHooks)
</script>
