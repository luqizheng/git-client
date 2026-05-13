<template>
  <div class="text-xs">
    <div v-if="progress.isActive" class="px-2 py-1 mb-1 bg-gray-800 rounded">
      <div class="flex items-center justify-between mb-0.5">
        <span class="text-gray-400">{{ progress.type === 'fetch' ? 'Fetching' : 'Pushing' }}</span>
        <span class="text-gray-500">{{ progress.bytes }}</span>
      </div>
      <n-progress
        type="line"
        :percentage="Math.round(progress.progress)"
        :show-indicator="false"
        :height="4"
        :border-radius="2"
        :fill-border-radius="2"
        :color="progress.type === 'fetch' ? '#3b82f6' : '#10b981'"
        :rail-color="'#374151'"
      />
      <div class="text-gray-600 mt-0.5">{{ progress.phase }}</div>
    </div>

    <div v-for="remote in remotes" :key="remote.name"
      class="flex items-center px-2 py-0.5 hover:bg-gray-700 cursor-pointer"
    >
      <span class="text-purple-400 mr-1">◈</span>
      <span class="text-gray-300">{{ remote.name }}</span>
      <span class="ml-1 text-gray-600 truncate">{{ remote.url }}</span>
    </div>
    <div v-if="remotes.length === 0" class="text-gray-600 px-2 py-0.5">No remotes</div>
    <n-button size="tiny" quaternary class="mt-1" @click="showAdd = true">+ Add Remote</n-button>

    <n-modal v-model:show="showAdd" preset="dialog" title="Add Remote">
      <n-form>
        <n-form-item label="Name">
          <n-input v-model:value="remoteName" placeholder="origin" />
        </n-form-item>
        <n-form-item label="URL">
          <n-input v-model:value="remoteUrl" placeholder="https://github.com/user/repo.git" />
        </n-form-item>
      </n-form>
      <template #action>
        <n-button @click="showAdd = false">Cancel</n-button>
        <n-button type="primary" @click="doAdd">Add</n-button>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { NButton, NModal, NForm, NFormItem, NInput, NProgress, useMessage } from 'naive-ui'
import { useRemoteStore } from '../../stores/remote'
import { useRepoStore } from '../../stores/repo'
import { useRemoteProgress } from '../../composables/useRemoteProgress'

const remoteStore = useRemoteStore()
const repo = useRepoStore()
const msgApi = useMessage()
const { progress } = useRemoteProgress()
const showAdd = ref(false)
const remoteName = ref('')
const remoteUrl = ref('')

const remotes = computed(() => repo.activeRepoPath ? remoteStore.getRemotes(repo.activeRepoPath) : [])

async function doAdd() {
  if (!repo.activeRepoPath || !remoteName.value || !remoteUrl.value) return
  try {
    await remoteStore.addRemote(repo.activeRepoPath, remoteName.value, remoteUrl.value)
    showAdd.value = false
    remoteName.value = ''
    remoteUrl.value = ''
  } catch (e) {
    msgApi.error(String(e))
  }
}

onMounted(() => {
  if (repo.activeRepoPath) remoteStore.fetchRemotes(repo.activeRepoPath)
})
</script>
