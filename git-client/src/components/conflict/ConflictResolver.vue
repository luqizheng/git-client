<template>
  <div v-if="conflicts.length > 0" class="flex flex-col h-full">
    <div class="p-3 border-b border-border bg-muted/50">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-accent-yellow text-sm font-medium">{{ conflicts.length }} Conflict(s)</span>
          <span class="text-xs text-muted-foreground">
            {{ resolvedCount }}/{{ conflicts.length }} resolved
          </span>
        </div>
        <div class="flex items-center gap-2">
          <Button
            v-if="resolvedCount === conflicts.length"
            size="sm"
            @click="$emit('complete')"
          >
            Complete Merge
          </Button>
          <Button
            v-else
            size="sm"
            disabled
            variant="outline"
          >
            Resolve all conflicts first
          </Button>
        </div>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto">
      <div v-for="(conflict, idx) in conflicts" :key="conflict.path" class="border-b border-border">
        <div class="flex items-center gap-2 px-3 py-2 bg-sidebar/50">
          <span :class="resolved[idx] ? 'text-accent-green' : 'text-destructive'" class="font-mono text-sm">
            {{ resolved[idx] ? '✓' : '✗' }}
          </span>
          <span class="text-sm font-medium truncate flex-1">{{ conflict.path }}</span>
          <div class="flex items-center gap-1">
            <Button size="xs" variant="outline" @click="useOurs(idx)">
              Use Ours
            </Button>
            <Button size="xs" variant="outline" @click="useTheirs(idx)">
              Use Theirs
            </Button>
          </div>
        </div>

        <div v-if="!resolved[idx]" class="p-3">
          <TwoWayDiff
            :ours="conflict.ours_content || ''"
            :theirs="conflict.theirs_content || ''"
            @select-ours="() => useOurs(idx)"
            @select-theirs="() => useTheirs(idx)"
          />
        </div>
        <div v-else class="p-3 bg-accent-green/5">
          <p class="text-sm text-accent-green">
            Resolved with: {{ resolution[idx] }}
          </p>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="flex items-center justify-center h-full text-muted-foreground">
    <p>No conflicts</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Button } from '@/components/ui/button'
import TwoWayDiff from './TwoWayDiff.vue'

interface ConflictFile {
  path: string
  ours_modified: boolean
  theirs_modified: boolean
  ours_content: string | null
  theirs_content: string | null
  base_content: string | null
}

const props = defineProps<{
  conflicts: ConflictFile[]
}>()

defineEmits<{ complete: [] }>()

const resolved = ref<boolean[]>(new Array(props.conflicts.length).fill(false))
const resolution = ref<string[]>(new Array(props.conflicts.length).fill(''))

const resolvedCount = computed(() => resolved.value.filter(r => r).length)

function useOurs(idx: number) {
  resolved.value[idx] = true
  resolution.value[idx] = 'Ours'
}

function useTheirs(idx: number) {
  resolved.value[idx] = true
  resolution.value[idx] = 'Theirs'
}
</script>
