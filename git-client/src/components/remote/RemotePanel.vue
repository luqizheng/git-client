<template>
  <div class="text-xs">
    <div v-for="remote in remoteStore.remotes" :key="remote.name"
      class="flex items-center px-2 py-0.5 hover:bg-gray-700 cursor-pointer"
    >
      <span class="text-purple-400 mr-1">◈</span>
      <span class="text-gray-300">{{ remote.name }}</span>
      <span class="ml-1 text-gray-600 truncate">{{ remote.url }}</span>
    </div>
    <div v-if="remoteStore.remotes.length === 0" class="text-gray-600 px-2 py-0.5">No remotes</div>
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
import { ref, onMounted } from 'vue'
import { NButton, NModal, NForm, NFormItem, NInput, useMessage } from 'naive-ui'
import { useRemoteStore } from '../../stores/remote'
import { useRepoStore } from '../../stores/repo'

const remoteStore = useRemoteStore()
const repo = useRepoStore()
const msgApi = useMessage()
const showAdd = ref(false)
const remoteName = ref('')
const remoteUrl = ref('')

async function doAdd() {
  if (!repo.repoPath || !remoteName.value || !remoteUrl.value) return
  try {
    await remoteStore.addRemote(repo.repoPath, remoteName.value, remoteUrl.value)
    showAdd.value = false
    remoteName.value = ''
    remoteUrl.value = ''
  } catch (e) {
    msgApi.error(String(e))
  }
}

onMounted(() => {
  if (repo.repoPath) remoteStore.fetchRemotes(repo.repoPath)
})
</script>
