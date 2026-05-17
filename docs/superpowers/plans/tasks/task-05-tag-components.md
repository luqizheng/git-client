# Task 05: Tag — Componentes Frontend

> **Fase:** 1 — P0 Core | **Dependências:** Task 04 (Tag store)
> **Plano original:** `docs/superpowers/plans/2026-05-17-git-client-features-implementation.md`

**Files:**
- Create: `git-client/src/components/tag/TagList.vue`
- Create: `git-client/src/components/tag/TagDialog.vue`

---

- [ ] **Step 1: Criar TagDialog.vue**

```vue
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
```

- [ ] **Step 2: Criar TagList.vue**

```vue
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
import { Tag as TagIcon } from '@vicons/fluent'
import { useMessage } from 'naive-ui'
import TagDialog from './TagDialog.vue'

const props = defineProps<{ repoPath: string }>()

const tagsStore = useTagsStore()
const message = useMessage()
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
    message.success(`标签 ${tag.name} 已删除`)
  } catch (e: any) {
    message.error(`删除失败: ${e}`)
  }
}

onMounted(loadTags)
</script>
```

- [ ] **Step 3: Verificar tipos**

Run: `cd git-client && npx vue-tsc --noEmit`
Expected: SUCCESS

- [ ] **Step 4: Commit**

```bash
git add git-client/src/components/tag/TagList.vue git-client/src/components/tag/TagDialog.vue
git commit -m "feat(tag): add TagList and TagDialog components"
```
