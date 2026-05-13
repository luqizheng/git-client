<template>
  <div v-if="diffStore.diffs.length > 0" class="flex h-full border-l border-gray-700">
    <FileTree
      :files="diffStore.diffs"
      :selected="diffStore.selectedFile"
      @select="diffStore.selectFile"
      class="w-48 border-r border-gray-700"
    />
    <div class="flex-1 flex flex-col">
      <div class="flex items-center gap-1 p-1 border-b border-gray-700">
        <n-button size="tiny" quaternary @click="sideBySide = true" :type="sideBySide ? 'primary' : 'default'">Split</n-button>
        <n-button size="tiny" quaternary @click="sideBySide = false" :type="!sideBySide ? 'primary' : 'default'">Unified</n-button>
        <div class="flex-1" />
        <n-button size="tiny" quaternary @click="monacoRef?.goToPrevChange()">Prev</n-button>
        <n-button size="tiny" quaternary @click="monacoRef?.goToNextChange()">Next</n-button>
      </div>
      <MonacoDiff
        ref="monacoRef"
        :original="originalContent"
        :modified="modifiedContent"
        :render-side-by-side="sideBySide"
        class="flex-1"
      />
    </div>
  </div>
  <div v-else class="flex-1 flex items-center justify-center text-gray-600">
    Select a commit to view diff
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { NButton } from 'naive-ui'
import FileTree from './FileTree.vue'
import MonacoDiff from './MonacoDiff.vue'
import { useDiffStore } from '../../stores/diff'

const diffStore = useDiffStore()
const sideBySide = ref(true)
const monacoRef = ref<InstanceType<typeof MonacoDiff> | null>(null)
const originalContent = ref('')
const modifiedContent = ref('')
</script>
