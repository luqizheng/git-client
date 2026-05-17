<template>
  <div class="submodule-list">
    <n-spin :show="loading">
      <n-empty v-if="!loading && submodules.length === 0" description="无子模块" />
      <n-list v-else>
        <n-list-item v-for="sm in submodules" :key="sm.name">
          <n-thing :title="sm.name">
            <template #description>
              <n-space size="small">
                <n-tag size="small">{{ sm.sha.substring(0, 7) }}</n-tag>
                <span>{{ sm.url }}</span>
              </n-space>
            </template>
          </n-thing>
          <template #suffix>
            <n-button v-if="!sm.is_initialized" size="tiny" type="primary" @click="handleInit(sm)">初始化</n-button>
            <n-button v-else size="tiny" @click="handleUpdate(sm)">更新</n-button>
          </template>
        </n-list-item>
      </n-list>
    </n-spin>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSubmoduleStore } from '../../stores/submodule'
import type { Submodule } from '../../types/git'
import { useMessage } from 'naive-ui'

const props = defineProps<{ repoPath: string }>()
const store = useSubmoduleStore()
const message = useMessage()
const loading = ref(false)

const submodules = ref<Submodule[]>([])

async function load() {
  loading.value = true
  try {
    submodules.value = await store.listSubmodules(props.repoPath)
  } finally {
    loading.value = false
  }
}

async function handleInit(sm: Submodule) {
  await store.initSubmodule(props.repoPath, sm.name)
  message.success(`子模块 ${sm.name} 初始化完成`)
}

async function handleUpdate(sm: Submodule) {
  await store.updateSubmodule(props.repoPath, sm.name)
  message.success(`子模块 ${sm.name} 更新完成`)
}

onMounted(load)
</script>