<template>
  <Dialog :open="showModel" @update:open="showModel = $event">
    <DialogContent class="sm:max-w-[600px] max-h-[80vh] flex flex-col">
      <DialogHeader>
        <DialogTitle>{{ isInProgress ? 'Continue Rebase' : 'Interactive Rebase' }}</DialogTitle>
        <DialogDescription v-if="!isInProgress">
          {{ t('rebase.selectBranches') }}
        </DialogDescription>
      </DialogHeader>

      <div v-if="!isInProgress" class="space-y-4 py-4">
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label>{{ t('rebase.currentBranch') }}</Label>
            <Select v-model="selectedBranch">
              <SelectTrigger>
                <SelectValue :placeholder="currentBranch || t('rebase.selectBranch')" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="b in localBranches" :key="b.name" :value="b.name">
                  {{ b.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-2">
            <Label>{{ t('rebase.ontoBranch') }}</Label>
            <Select v-model="selectedUpstream">
              <SelectTrigger>
                <SelectValue :placeholder="t('rebase.selectUpstream')" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="b in allBranches" :key="b.name" :value="b.name">
                  {{ b.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div v-if="isInProgress || rebaseStore.operations.length > 0" class="flex-1 overflow-y-auto py-4">
        <div class="space-y-1">
          <div
            v-for="(op, idx) in rebaseStore.operations"
            :key="op.id"
            class="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/50"
            :class="{ 'bg-accent': idx === currentOperationIdx }"
          >
            <span class="w-6 h-6 flex items-center justify-center rounded bg-muted text-xs font-mono">
              {{ idx + 1 }}
            </span>
            <Select v-model="op.action" class="w-24">
              <SelectTrigger class="h-7">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pick">pick</SelectItem>
                <SelectItem value="reword">reword</SelectItem>
                <SelectItem value="edit">edit</SelectItem>
                <SelectItem value="squash">squash</SelectItem>
                <SelectItem value="fixup">fixup</SelectItem>
                <SelectItem value="drop">drop</SelectItem>
              </SelectContent>
            </Select>
            <span class="flex-1 text-sm truncate font-mono text-muted-foreground">
              {{ op.commit_id.slice(0, 7) }}
            </span>
            <span class="flex-1 text-sm truncate">
              {{ op.message }}
            </span>
          </div>
        </div>

        <div v-if="rebaseStore.error" class="mt-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
          {{ rebaseStore.error }}
        </div>
      </div>

      <DialogFooter class="gap-2">
        <div class="flex-1">
          <span v-if="isInProgress" class="text-sm text-muted-foreground">
            {{ t('rebase.inProgress') }}
          </span>
        </div>
        <Button v-if="isInProgress" variant="destructive" @click="handleAbort" :disabled="rebaseStore.isLoading">
          {{ t('rebase.abort') }}
        </Button>
        <Button v-if="isInProgress" @click="handleContinue" :disabled="rebaseStore.isLoading">
          {{ t('rebase.continue') }}
        </Button>
        <Button v-if="!isInProgress" @click="handleStart" :disabled="!canStart || rebaseStore.isLoading">
          {{ t('rebase.startRebase') }}
        </Button>
        <Button variant="outline" @click="showModel = false">
          {{ t('common.close') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { useRebaseStore } from '@/stores/rebase'
import { useBranchesStore } from '@/stores/branches'
import { useRepoStore } from '@/stores/repo'

const { t } = useI18n()
const props = defineProps<{ show: string | null }>()
const emit = defineEmits<{ 'update:show': [value: string | null]; 'rebase-complete': [] }>()

const rebaseStore = useRebaseStore()
const branchesStore = useBranchesStore()
const repoStore = useRepoStore()

const selectedBranch = ref('')
const selectedUpstream = ref('')

const showModel = computed({
  get: () => props.show === 'rebase',
  set: (val) => emit('update:show', val ? 'rebase' : null)
})

const currentRepo = computed(() => repoStore.activeRepo?.state.path || '')
const currentBranch = computed(() => currentRepo.value ? branchesStore.currentBranch(currentRepo.value) : '')
const localBranches = computed(() => {
  if (!currentRepo.value) return []
  const repo = repoStore.openRepos.get(currentRepo.value)
  return repo?.branches.filter(b => !b.is_remote) ?? []
})
const allBranches = computed(() => {
  if (!currentRepo.value) return []
  const repo = repoStore.openRepos.get(currentRepo.value)
  return repo?.branches.filter(b => !b.is_remote && b.name !== selectedBranch.value) ?? []
})

const isInProgress = computed(() => rebaseStore.inProgress)
const currentOperationIdx = computed(() => rebaseStore.operations.length > 0 ? 0 : -1)

const canStart = computed(() => selectedBranch.value && selectedUpstream.value && selectedBranch.value !== selectedUpstream.value)

watch(showModel, async (val) => {
  if (val && currentRepo.value) {
    selectedBranch.value = currentBranch.value
    await rebaseStore.checkRebaseInProgress(currentRepo.value)
  }
})

async function handleStart() {
  if (!currentRepo.value || !canStart.value) return
  try {
    await rebaseStore.startRebase(currentRepo.value, selectedUpstream.value, selectedBranch.value)
    if (!rebaseStore.inProgress) {
      showModel.value = false
      emit('rebase-complete')
    }
  } catch (e) {
    console.error('Rebase failed:', e)
  }
}

async function handleContinue() {
  if (!currentRepo.value) return
  try {
    await rebaseStore.continueRebase(currentRepo.value)
    showModel.value = false
    emit('rebase-complete')
  } catch (e) {
    console.error('Continue rebase failed:', e)
  }
}

async function handleAbort() {
  if (!currentRepo.value) return
  try {
    await rebaseStore.abortRebase(currentRepo.value)
    showModel.value = false
  } catch (e) {
    console.error('Abort rebase failed:', e)
  }
}
</script>
