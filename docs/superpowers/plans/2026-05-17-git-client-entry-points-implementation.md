# Git 客户端功能入口实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 13 个缺失的 Git 功能模块添加统一的入口（Sidebar 面板 + Toolbar 菜单 + 右键菜单）

**架构:** 采用 Sidebar 扩展存放常用功能（Tags/Submodules/Worktrees），Toolbar 下拉菜单存放高级功能（Git Flow/Revert/Rebase 等），Commit List 右键菜单补充快捷操作

**Tech Stack:** Vue 3, TypeScript, Naive UI, Pinia, Tauri IPC

---

## 文件结构

### 修改现有文件
- `src/components/layout/Sidebar.vue` - 新增 Tags/Submodules/Worktrees 面板
- `src/components/layout/Toolbar.vue` - 新增"更多"下拉菜单
- `src/components/commit/components/commit-list/commit-list.vue` - 增强右键菜单

### 新建组件
- `src/components/worktree/WorktreeList.vue` - 工作树列表面板
- `src/components/worktree/WorktreeDialog.vue` - 添加工作树对话框
- `src/stores/worktree.ts` - 工作树状态管理

### 新建对话框（占位，后续任务实现功能）
- `src/components/gitflow/GitFlowDialog.vue`
- `src/components/revert/RevertDialog.vue`
- `src/components/rebase/RebaseDialog.vue`
- `src/components/compare/BranchCompareDialog.vue`
- `src/components/search/AdvancedSearchDialog.vue`
- `src/components/hook/HookDialog.vue`
- `src/components/config/ConfigDialog.vue`

---

## Task 1: Sidebar 接入 Tags 面板

**Files:**
- Modify: `src/components/layout/Sidebar.vue`

**依赖:** TagList.vue 和 tags store 已存在

- [ ] **Step 1: 导入依赖**

在 Sidebar.vue 的 script 部分添加：

```typescript
import { Tag as TagIcon } from '@vicons/ionicons5'
import TagList from '../tag/TagList.vue'
```

- [ ] **Step 2: 添加 Tags 面板**

在 Sidebar 的 template 中，Working Files 面板下方添加：

```vue
<div class="p-2 border-t border-gray-700">
  <div class="text-xs text-gray-500 mb-1 flex items-center gap-1.5">
    <n-icon :size="12" class="text-gray-500"><TagIcon /></n-icon>
    Tags
  </div>
  <TagList v-if="repo.activeRepoPath" :repo-path="repo.activeRepoPath" />
</div>
```

- [ ] **Step 3: 验证 Tags 面板显示**

运行开发服务器，检查 Sidebar 是否正确显示 Tags 面板。

---

## Task 2: Sidebar 接入 Submodules 面板

**Files:**
- Modify: `src/components/layout/Sidebar.vue`

**依赖:** SubmoduleList.vue 和 submodule store 已存在

- [ ] **Step 1: 导入依赖**

```typescript
import { Cube as CubeIcon } from '@vicons/ionicons5'
import SubmoduleList from '../submodule/SubmoduleList.vue'
```

- [ ] **Step 2: 添加 Submodules 面板**

在 Tags 面板下方添加：

```vue
<div class="p-2 border-t border-gray-700">
  <div class="text-xs text-gray-500 mb-1 flex items-center gap-1.5">
    <n-icon :size="12" class="text-gray-500"><CubeIcon /></n-icon>
    Submodules
  </div>
  <SubmoduleList v-if="repo.activeRepoPath" :repo-path="repo.activeRepoPath" />
</div>
```

- [ ] **Step 3: 验证 Submodules 面板显示**

---

## Task 3: 新建 Worktree Store

**Files:**
- Create: `src/stores/worktree.ts`

- [ ] **Step 1: 创建 worktree store**

```typescript
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Worktree } from '../types/git'
import { invoke } from '../utils/ipc'

export const useWorktreeStore = defineStore('worktree', () => {
  const worktrees = ref<Worktree[]>([])

  async function listWorktrees(repoPath: string) {
    worktrees.value = await invoke<Worktree[]>('list_worktrees', { repo_path: repoPath })
    return worktrees.value
  }

  async function addWorktree(repoPath: string, path: string, branch?: string) {
    await invoke<null>('add_worktree', { repo_path: repoPath, path, branch })
    await listWorktrees(repoPath)
  }

  async function removeWorktree(repoPath: string, path: string) {
    await invoke<null>('remove_worktree', { repo_path: repoPath, path })
    await listWorktrees(repoPath)
  }

  return { worktrees, listWorktrees, addWorktree, removeWorktree }
})
```

- [ ] **Step 2: 添加 Worktree 类型到 git.d.ts**

在 `src/types/git.d.ts` 中添加：

```typescript
export interface Worktree {
  path: string
  branch?: string
  is_main: boolean
}
```

---

## Task 4: 新建 WorktreeList 组件

**Files:**
- Create: `src/components/worktree/WorktreeList.vue`

- [ ] **Step 1: 创建组件文件**

```vue
<template>
  <div class="worktree-list">
    <n-spin :show="loading">
      <n-empty v-if="!loading && worktrees.length === 0" description="无工作树" />
      <div v-else class="text-xs">
        <div
          v-for="wt in worktrees"
          :key="wt.path"
          class="flex items-center px-2 py-0.5 hover:bg-gray-700 cursor-pointer"
          :class="{ 'bg-gray-700': wt.is_main }"
        >
          <span class="mr-1" :class="wt.is_main ? 'text-green-400' : 'text-blue-400'">
            {{ wt.is_main ? '●' : '○' }}
          </span>
          <span class="text-gray-300 truncate">{{ getWorktreeName(wt.path) }}</span>
          <span v-if="wt.branch" class="ml-1 text-gray-600">({{ wt.branch }})</span>
        </div>
      </div>
    </n-spin>

    <n-button size="tiny" quaternary class="mt-1" @click="showDialog = true">+ Add Worktree</n-button>
    <WorktreeDialog v-model:show="showDialog" :repo-path="repoPath" @created="loadWorktrees" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useWorktreeStore } from '../../stores/worktree'
import type { Worktree } from '../../types/git'
import { NButton, NSpin, NEmpty } from 'naive-ui'
import WorktreeDialog from './WorktreeDialog.vue'

const props = defineProps<{ repoPath: string }>()
const store = useWorktreeStore()
const loading = ref(false)
const showDialog = ref(false)

const worktrees = ref<Worktree[]>([])

function getWorktreeName(path: string) {
  return path.split(/[\\/]/).pop() || path
}

async function loadWorktrees() {
  loading.value = true
  try {
    worktrees.value = await store.listWorktrees(props.repoPath)
  } finally {
    loading.value = false
  }
}

onMounted(loadWorktrees)
</script>
```

---

## Task 5: 新建 WorktreeDialog 组件

**Files:**
- Create: `src/components/worktree/WorktreeDialog.vue`

- [ ] **Step 1: 创建对话框组件**

```vue
<template>
  <n-modal
    v-model:show="showModel"
    title="Add Worktree"
    preset="card"
    style="width: 400px"
    :mask-closable="false"
  >
    <n-form :model="form" label-placement="left" label-width="80">
      <n-form-item label="Path">
        <n-input v-model:value="form.path" placeholder="Enter worktree path" />
      </n-form-item>
      <n-form-item label="Branch">
        <n-input v-model:value="form.branch" placeholder="Optional: branch name" />
      </n-form-item>
    </n-form>
    <template #footer>
      <n-space justify="end">
        <n-button @click="showModel = false">Cancel</n-button>
        <n-button type="primary" @click="handleSubmit" :loading="submitting">Add</n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useWorktreeStore } from '../../stores/worktree'
import { NModal, NForm, NFormItem, NInput, NButton, NSpace, useMessage } from 'naive-ui'

const props = defineProps<{
  show: boolean
  repoPath: string
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  'created': []
}>()

const store = useWorktreeStore()
const message = useMessage()
const submitting = ref(false)

const showModel = computed({
  get: () => props.show,
  set: (v) => emit('update:show', v)
})

const form = ref({
  path: '',
  branch: ''
})

async function handleSubmit() {
  if (!form.value.path) {
    message.error('Please enter worktree path')
    return
  }
  submitting.value = true
  try {
    await store.addWorktree(props.repoPath, form.value.path, form.value.branch || undefined)
    message.success('Worktree added successfully')
    form.value = { path: '', branch: '' }
    showModel.value = false
    emit('created')
  } catch (e: any) {
    message.error(`Failed to add worktree: ${e}`)
  } finally {
    submitting.value = false
  }
}
</script>
```

---

## Task 6: Sidebar 接入 Worktrees 面板

**Files:**
- Modify: `src/components/layout/Sidebar.vue`

- [ ] **Step 1: 导入依赖**

```typescript
import { FolderOpen as FolderIcon } from '@vicons/ionicons5'
import WorktreeList from '../worktree/WorktreeList.vue'
```

- [ ] **Step 2: 添加 Worktrees 面板**

在 Submodules 面板下方添加：

```vue
<div class="p-2 border-t border-gray-700">
  <div class="text-xs text-gray-500 mb-1 flex items-center gap-1.5">
    <n-icon :size="12" class="text-gray-500"><FolderIcon /></n-icon>
    Worktrees
  </div>
  <WorktreeList v-if="repo.activeRepoPath" :repo-path="repo.activeRepoPath" />
</div>
```

---

## Task 7: Toolbar 添加"更多"下拉菜单

**Files:**
- Modify: `src/components/layout/Toolbar.vue`

- [ ] **Step 1: 导入依赖**

```typescript
import { NDropdown, type DropdownOption } from 'naive-ui'
import { EllipsisHorizontal as MoreIcon } from '@vicons/ionicons5'
```

- [ ] **Step 2: 添加下拉菜单数据**

在 script 中添加：

```typescript
const moreMenuOptions: DropdownOption[] = [
  {
    key: 'gitflow',
    label: 'Git Flow',
    children: [
      { key: 'gitflow-init', label: 'Initialize Git Flow' },
      { key: 'gitflow-feature', label: 'Start Feature' },
      { key: 'gitflow-release', label: 'Start Release' },
      { key: 'gitflow-hotfix', label: 'Start Hotfix' }
    ]
  },
  { key: 'divider1', type: 'divider' },
  { key: 'revert', label: 'Revert...' },
  { key: 'rebase', label: 'Rebase...' },
  { key: 'compare', label: 'Branch Compare...' },
  { key: 'search', label: 'Advanced Search...' },
  { key: 'divider2', type: 'divider' },
  { key: 'hooks', label: 'Hook Management...' },
  { key: 'config', label: 'Config...' }
]

function handleMoreMenuSelect(key: string) {
  emit('more', key)
}
```

- [ ] **Step 3: 添加 emit 定义**

```typescript
defineEmits(['open', 'clone', 'fetch', 'pull', 'push', 'more'])
```

- [ ] **Step 4: 在模板中添加下拉按钮**

在主题切换按钮之前添加：

```vue
<n-dropdown :options="moreMenuOptions" @select="handleMoreMenuSelect">
  <n-button quaternary size="small" title="More Actions">
    <template #icon>
      <n-icon :size="14"><MoreIcon /></n-icon>
    </template>
    More
  </n-button>
</n-dropdown>
<n-divider vertical />
```

---

## Task 8: AppLayout 处理 More 菜单事件

**Files:**
- Modify: `src/components/layout/AppLayout.vue`

- [ ] **Step 1: 添加 activeDialog 状态**

```typescript
const activeDialog = ref<string | null>(null)

function handleMoreAction(key: string) {
  switch (key) {
    case 'revert':
    case 'rebase':
    case 'compare':
    case 'search':
    case 'hooks':
    case 'config':
    case 'gitflow-init':
    case 'gitflow-feature':
    case 'gitflow-release':
    case 'gitflow-hotfix':
      activeDialog.value = key
      break
    default:
      console.log('Unhandled action:', key)
  }
}
```

- [ ] **Step 2: 修改 Toolbar 绑定**

```vue
<Toolbar @open="handleOpen" @more="handleMoreAction" />
```

- [ ] **Step 3: 添加对话框占位**

在 template 底部添加：

```vue
<!-- Dialog placeholders - will be implemented in future tasks -->
<RevertDialog v-if="activeDialog === 'revert'" v-model:show="activeDialog" />
<RebaseDialog v-if="activeDialog === 'rebase'" v-model:show="activeDialog" />
<BranchCompareDialog v-if="activeDialog === 'compare'" v-model:show="activeDialog" />
<AdvancedSearchDialog v-if="activeDialog === 'search'" v-model:show="activeDialog" />
<HookDialog v-if="activeDialog === 'hooks'" v-model:show="activeDialog" />
<ConfigDialog v-if="activeDialog === 'config'" v-model:show="activeDialog" />
<GitFlowDialog v-if="activeDialog?.startsWith('gitflow')" v-model:show="activeDialog" :action="activeDialog" />
```

---

## Task 9: Commit List 右键菜单增强

**Files:**
- Modify: `src/components/commit/components/commit-list/commit-list.vue`

- [ ] **Step 1: 修改 menuOptions**

在现有菜单选项中添加 Revert：

```typescript
const menuOptions = computed<DropdownOption[]>(() => {
  if (!contextMenu.value.commit) return []
  return [
    { key: 'cherry-pick', label: 'Cherry-pick this commit', icon: renderIcon('cherry') },
    { key: 'divider-1', type: 'divider' },
    { key: 'revert', label: 'Revert this commit', icon: renderIcon('revert') },
    { key: 'rebase', label: 'Rebase onto this commit...', icon: renderIcon('rebase') },
    {
      key: 'reset',
      label: 'Reset',
      children: [
        { key: 'reset-soft', label: 'Soft' },
        { key: 'reset-mixed', label: 'Mixed' },
        { key: 'reset-hard', label: 'Hard', props: { style: 'color: var(--danger-color, #ef4444)' } },
      ],
    },
    // ... rest of menu
  ]
})
```

- [ ] **Step 2: 添加 revert 图标**

```typescript
const SVG_PATHS: Record<string, string> = {
  cherry: 'M12 2a7 7 0 00-7 7c0 2.38 1.19 4.47 3 5.74V17a2 2 0 002 2h4a2 2 0 002-2v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 00-7-7zM9 21h6',
  revert: 'M3 10h10a4 4 0 004-4V4M3 10l4-4m-4 4l4 4', // 撤销箭头
  rebase: 'M4 12h16m-4-4l4 4-4 4',
  // ... rest
}
```

- [ ] **Step 3: 处理菜单点击事件**

修改 `onDropdownSelect`：

```typescript
function onDropdownSelect(key: string) {
  const commit = contextMenu.value.commit
  if (!commit) return
  
  switch (key) {
    case 'cherry-pick':
      emit('cherryPick', commit.id)
      break
    case 'revert':
      emit('revert', commit.id)
      break
    case 'rebase':
      emit('rebase', commit.id)
      break
    // ... handle other keys
  }
  hideContextMenu()
}
```

- [ ] **Step 4: 添加 emit 定义**

```typescript
const emit = defineEmits<{
  cherryPick: [commitId: string]
  revert: [commitId: string]
  rebase: [commitId: string]
  // ... other emits
}>()
```

---

## Task 10: 创建对话框占位组件

**Files:**
- Create: `src/components/gitflow/GitFlowDialog.vue`
- Create: `src/components/revert/RevertDialog.vue`
- Create: `src/components/rebase/RebaseDialog.vue`
- Create: `src/components/compare/BranchCompareDialog.vue`
- Create: `src/components/search/AdvancedSearchDialog.vue`
- Create: `src/components/hook/HookDialog.vue`
- Create: `src/components/config/ConfigDialog.vue`

- [ ] **Step 1: 创建统一的占位对话框模板**

每个对话框使用相同结构：

```vue
<template>
  <n-modal
    v-model:show="showModel"
    title="[Dialog Title]"
    preset="card"
    style="width: 500px"
  >
    <n-empty description="功能开发中..." />
    <template #footer>
      <n-space justify="end">
        <n-button @click="showModel = false">Close</n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NModal, NEmpty, NButton, NSpace } from 'naive-ui'

const props = defineProps<{ show: string | null }>()
const emit = defineEmits<{ 'update:show': [value: string | null] }>()

const showModel = computed({
  get: () => props.show === '[dialog-key]',
  set: () => emit('update:show', null)
})
</script>
```

为每个对话框替换 `[Dialog Title]` 和 `[dialog-key]`：
- GitFlowDialog: "Git Flow", key: "gitflow-init" 等
- RevertDialog: "Revert Commit", key: "revert"
- RebaseDialog: "Rebase", key: "rebase"
- BranchCompareDialog: "Branch Compare", key: "compare"
- AdvancedSearchDialog: "Advanced Search", key: "search"
- HookDialog: "Hook Management", key: "hooks"
- ConfigDialog: "Config", key: "config"

---

## Task 11: 验证所有入口

**Files:**
- All modified and created files

- [ ] **Step 1: 运行开发服务器**

```bash
cd git-client
npm run dev
```

- [ ] **Step 2: 验证 Sidebar 面板**

- [ ] Tags 面板显示正常
- [ ] Submodules 面板显示正常  
- [ ] Worktrees 面板显示正常

- [ ] **Step 3: 验证 Toolbar 菜单**

- [ ] "More" 按钮显示在 Toolbar
- [ ] 点击展开下拉菜单
- [ ] 所有菜单项可见

- [ ] **Step 4: 验证右键菜单**

- [ ] Commit List 右键显示 Revert 选项
- [ ] Rebase 选项可见

---

## 测试检查清单

- [ ] Sidebar 三个新面板正常渲染
- [ ] Worktree 添加功能可用
- [ ] Toolbar "More"菜单可点击展开
- [ ] 所有菜单项点击弹出对应对话框
- [ ] Commit List 右键菜单包含 Revert
- [ ] 样式与现有 UI 一致
- [ ] Dark/Light 主题切换正常
