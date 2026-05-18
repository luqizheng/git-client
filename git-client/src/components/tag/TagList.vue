<template>
  <div class="tag-list">
    <n-spin :show="loading">
      <n-empty v-if="!loading && tagsStore.tags.length === 0" description="暂无标签" />
      <n-list v-else>
        <n-list-item v-for="tag in tagsStore.tags" :key="tag.name">
          <template #prefix>
            <n-icon :component="TagIcon" size="18" />
          </template>
          <n-thing :title="tag.name">
            <template #description>
              <n-space size="small">
                <n-tag size="small" :bordered="false">{{ tag.target.substring(0, 7) }}</n-tag>
                <span v-if="tag.message">{{ tag.message }}</span>
              </n-space>
            </template>
          </n-thing>
          <template #suffix>
            <n-button size="tiny" type="error" @click="handleDelete(tag)">删除</n-button>
          </template>
        </n-list-item>
      </n-list>
    </n-spin>

    <div class="pt-3">
      <n-button @click="showDialog = true" type="primary" block ghost>新建标签</n-button>
    </div>

    <TagDialog v-model:visible="showDialog" :repo-path="repoPath" @created="loadTags" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useTagsStore } from '../../stores/tags'
import type { Tag } from '../../types/git'
import { Tag16Regular as TagIcon } from '@vicons/fluent'
import { toast } from 'vue-sonner'
import TagDialog from './TagDialog.vue'

const props = defineProps<{ repoPath: string }>()

const tagsStore = useTagsStore()
const showDialog = ref(false)
const loading = ref(false)

async function loadTags() {
  loading.value = true
  try {
    await tagsStore.listTags(props.repoPath)
  } finally {
    loading.value = false
  }
}

async function handleDelete(tag: Tag) {
  try {
    await tagsStore.deleteTag(props.repoPath, tag.name)
    toast.success(`标签 ${tag.name} 已删除`)
  } catch (e: any) {
    toast.error(`删除失败: ${e}`)
  }
}

onMounted(loadTags)
</script>
