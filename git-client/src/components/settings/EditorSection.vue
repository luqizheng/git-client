<template>
  <div class="space-y-6">
    <h3 class="text-lg font-medium">{{ t('settings.tabs.editor') }}</h3>

    <div class="space-y-4">
      <div class="grid grid-cols-4 gap-4">
        <Label class="text-right col-span-1 pt-2">{{ t('settings.editor.commitMsg') }}</Label>
        <Input v-model="commitEditor" class="col-span-3" placeholder="vim, nano, code --wait" />
      </div>

      <div class="grid grid-cols-4 gap-4">
        <Label class="text-right col-span-1 pt-2">{{ t('settings.editor.diffTool') }}</Label>
        <Select v-model="diffTool" class="col-span-3 w-48">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{{ t('settings.editor.none') }}</SelectItem>
            <SelectItem value="vscode">VS Code</SelectItem>
            <SelectItem value="vimdiff">Vim Diff</SelectItem>
            <SelectItem value="opendiff">Opendiff</SelectItem>
            <SelectItem value="kdiff3">KDiff3</SelectItem>
            <SelectItem value="meld">Meld</SelectItem>
            <SelectItem value="p4merge">P4Merge</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div class="grid grid-cols-4 gap-4">
        <Label class="text-right col-span-1 pt-2">{{ t('settings.editor.mergeTool') }}</Label>
        <Select v-model="mergeTool" class="col-span-3 w-48">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{{ t('settings.editor.none') }}</SelectItem>
            <SelectItem value="vscode">VS Code</SelectItem>
            <SelectItem value="vimdiff">Vim Diff</SelectItem>
            <SelectItem value="opendiff">Opendiff</SelectItem>
            <SelectItem value="kdiff3">KDiff3</SelectItem>
            <SelectItem value="meld">Meld</SelectItem>
            <SelectItem value="p4merge">P4Merge</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator />

      <h4 class="text-sm font-medium text-muted-foreground">{{ t('settings.editor.diffViewer') }}</h4>
      <div class="grid grid-cols-4 gap-4">
        <Label class="text-right col-span-1 pt-2">{{ t('settings.editor.fontSize') }}</Label>
        <Select v-model="fontSize" class="col-span-3 w-32">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="11">11px</SelectItem>
            <SelectItem value="12">12px</SelectItem>
            <SelectItem value="13">13px</SelectItem>
            <SelectItem value="14">14px</SelectItem>
            <SelectItem value="15">15px</SelectItem>
            <SelectItem value="16">16px</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div class="grid grid-cols-4 gap-4">
        <Label class="text-right col-span-1 pt-2">{{ t('settings.editor.tabSize') }}</Label>
        <Select v-model="tabSize" class="col-span-3 w-32">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2">2</SelectItem>
            <SelectItem value="4">4</SelectItem>
            <SelectItem value="8">8</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div class="flex items-center justify-between">
        <div>
          <Label>{{ t('settings.editor.wordWrap') }}</Label>
          <p class="text-xs text-muted-foreground">{{ t('settings.editor.wordWrapDesc') }}</p>
        </div>
        <Switch v-model="wordWrap" />
      </div>
    </div>

    <div class="flex justify-end gap-2">
      <Button @click="saveEditor" :disabled="saving">
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
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { toast } from 'vue-sonner'

const { t } = useI18n()
const saving = ref(false)

const commitEditor = ref('')
const diffTool = ref('')
const mergeTool = ref('')
const fontSize = ref('13')
const tabSize = ref('4')
const wordWrap = ref(true)

async function loadEditor() {
  try {
    const config = await invoke<Record<string, string>>('get_git_config', { scope: 'global' })
    commitEditor.value = config['core.editor'] || ''
    diffTool.value = config['diff.tool'] || ''
    mergeTool.value = config['merge.tool'] || ''
  } catch (e) {
    console.error('loadEditor error:', e)
  }
}

async function saveEditor() {
  saving.value = true
  try {
    const config: Record<string, string> = {}
    
    if (commitEditor.value) config['core.editor'] = commitEditor.value
    if (diffTool.value) config['diff.tool'] = diffTool.value
    if (mergeTool.value) config['merge.tool'] = mergeTool.value

    await invoke('set_git_config', { config, scope: 'global' })
    
    localStorage.setItem('diff-font-size', fontSize.value)
    localStorage.setItem('diff-tab-size', tabSize.value)
    localStorage.setItem('diff-word-wrap', String(wordWrap.value))
    
    toast.success(t('common.saved'))
  } catch (e) {
    toast.error(String(e))
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  fontSize.value = localStorage.getItem('diff-font-size') || '13'
  tabSize.value = localStorage.getItem('diff-tab-size') || '4'
  wordWrap.value = localStorage.getItem('diff-word-wrap') !== 'false'
  loadEditor()
})
</script>
