<template>
  <n-modal v-model:show="showModal" preset="dialog" title="新建标签" @update:show="handleClose">
    <n-form :model="form" label-width="80">
      <n-form-item label="名称" path="name">
        <n-input v-model:value="form.name" placeholder="标签名称 (如 v1.0.0)" />
      </n-form-item>
      <n-form-item label="目标" path="target">
        <n-input v-model:value="form.target" placeholder="Commit Hash 或 HEAD" />
      </n-form-item>
      <n-form-item label="注释" path="message">
        <n-input v-model:value="form.message" placeholder="可选注释" />
      </n-form-item>
    </n-form>
    <template #action>
      <n-space>
        <n-button @click="handleClose">取消</n-button>
        <n-button type="primary" @click="handleCreate" :disabled="!form.name">创建</n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { useTagsStore } from '../../stores/tags'
import { useMessage } from 'naive-ui'

const props = defineProps<{ visible: boolean; repoPath: string }>()
const emit = defineEmits<{ 'update:visible': [boolean]; created: [] }>()

const showModal = ref(props.visible)
watch(() => props.visible, (v) => { showModal.value = v })

const tagsStore = useTagsStore()
const message = useMessage()

const form = reactive({
  name: '',
  target: 'HEAD',
  message: '',
})

function handleClose() {
  emit('update:visible', false)
}

async function handleCreate() {
  try {
    await tagsStore.createTag(props.repoPath, form.name, form.target, form.message || undefined)
    message.success(`标签 ${form.name} 创建成功`)
    form.name = ''
    form.message = ''
    emit('created')
  } catch (e: any) {
    message.error(`创建失败: ${e}`)
  }
}
</script>
