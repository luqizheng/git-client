<template>
  <div class="space-y-6">
    <h3 class="text-lg font-medium">{{ t('settings.tabs.shortcuts') }}</h3>

    <div class="space-y-4">
      <div v-for="category in shortcutCategories" :key="category.name" class="space-y-2">
        <h4 class="text-sm font-medium text-muted-foreground">{{ category.name }}</h4>
        <div class="space-y-1">
          <div
            v-for="shortcut in category.shortcuts"
            :key="shortcut.id"
            class="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50"
          >
            <span class="text-sm">{{ shortcut.label }}</span>
            <div class="flex items-center gap-1">
              <kbd
                v-for="(key, idx) in shortcut.keys"
                :key="idx"
                class="px-2 py-1 text-xs rounded bg-muted border border-border font-mono"
              >
                {{ key }}
              </kbd>
              <Button size="sm" variant="ghost" class="ml-2" @click="resetShortcut(shortcut.id)">
                {{ t('common.reset') }}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'

const { t } = useI18n()

interface Shortcut {
  id: string
  label: string
  keys: string[]
}

interface Category {
  name: string
  shortcuts: Shortcut[]
}

const shortcutCategories: Category[] = [
  {
    name: 'General',
    shortcuts: [
      { id: 'open-repo', label: 'Open Repository', keys: ['Ctrl', 'O'] },
      { id: 'settings', label: 'Open Settings', keys: ['Ctrl', ','] },
      { id: 'search', label: 'Search', keys: ['Ctrl', 'Shift', 'F'] },
    ]
  },
  {
    name: 'Commit',
    shortcuts: [
      { id: 'commit', label: 'Commit', keys: ['Ctrl', 'Enter'] },
      { id: 'amend', label: 'Amend', keys: ['Ctrl', 'Shift', 'A'] },
      { id: 'stage-all', label: 'Stage All', keys: ['Ctrl', 'S'] },
      { id: 'unstage-all', label: 'Unstage All', keys: ['Ctrl', 'Shift', 'U'] },
    ]
  },
  {
    name: 'Branch',
    shortcuts: [
      { id: 'new-branch', label: 'New Branch', keys: ['Ctrl', 'B'] },
      { id: 'switch-branch', label: 'Switch Branch', keys: ['Ctrl', 'Shift', 'B'] },
      { id: 'delete-branch', label: 'Delete Branch', keys: ['Ctrl', 'Shift', 'D'] },
    ]
  },
  {
    name: 'Remote',
    shortcuts: [
      { id: 'fetch', label: 'Fetch', keys: ['Ctrl', 'Shift', 'R'] },
      { id: 'pull', label: 'Pull', keys: ['Ctrl', 'Shift', 'P'] },
      { id: 'push', label: 'Push', keys: ['Ctrl', 'Shift', 'Push'] },
      { id: 'force-push', label: 'Force Push', keys: ['Ctrl', 'Shift', 'Shift', 'P'] },
    ]
  },
  {
    name: 'History',
    shortcuts: [
      { id: 'undo', label: 'Undo', keys: ['Ctrl', 'Z'] },
      { id: 'redo', label: 'Redo', keys: ['Ctrl', 'Shift', 'Z'] },
    ]
  },
]

function resetShortcut(id: string) {
  localStorage.removeItem(`shortcut-${id}`)
}
</script>
