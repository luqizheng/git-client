# Git客户端 实施计划 — 06: 前端布局组件

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现整体布局：AppLayout、Sidebar、Toolbar、StatusBar，集成Naive UI和UnoCSS

**Architecture:** AppLayout采用flex三栏布局：左侧Sidebar(240px)、中间上部GraphView+下部DetailPanel、右侧可选。Toolbar固定顶部，StatusBar固定底部。Naive UI的NConfigProvider包裹全局主题。

**Tech Stack:** Vue3, Naive UI, UnoCSS, TypeScript

---

### Task 1: 实现AppLayout主布局

**Files:**
- Modify: `src/components/layout/AppLayout.vue`
- Modify: `src/App.vue`

- [ ] **Step 1: 写AppLayout**

`src/components/layout/AppLayout.vue`:
```vue
<template>
  <n-config-provider :theme="themeOverrides">
    <n-message-provider>
      <div class="h-screen flex flex-col bg-gray-900 text-gray-100">
        <Toolbar />
        <div class="flex flex-1 overflow-hidden">
          <Sidebar />
          <main class="flex-1 flex flex-col overflow-hidden">
            <slot />
          </main>
        </div>
        <StatusBar />
      </div>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { darkTheme } from 'naive-ui'
import Toolbar from './Toolbar.vue'
import Sidebar from './Sidebar.vue'
import StatusBar from './StatusBar.vue'
import { useAppStore } from '../../stores/app'

const app = useAppStore()
const themeOverrides = computed(() => app.theme === 'dark' ? darkTheme : null)
</script>
```

- [ ] **Step 2: 修改App.vue**

`src/App.vue`:
```vue
<template>
  <AppLayout>
    <div class="flex-1 flex">
      <GraphView />
      <DiffView />
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import AppLayout from './components/layout/AppLayout.vue'
import GraphView from './components/graph/GraphView.vue'
import DiffView from './components/diff/DiffView.vue'
</script>
```

- [ ] **Step 3: 验证渲染**

Run:
```powershell
cd d:\projects\req2task-2\git-client
npx vite build
```

Expected: 构建成功

- [ ] **Step 4: Commit**

```bash
git add src/App.vue src/components/layout/AppLayout.vue
git commit -m "feat: add AppLayout with Naive UI dark theme, flex layout"
```

---

### Task 2: 实现Toolbar

**Files:**
- Modify: `src/components/layout/Toolbar.vue`

- [ ] **Step 1: 写Toolbar**

`src/components/layout/Toolbar.vue`:
```vue
<template>
  <div class="h-10 flex items-center px-3 bg-gray-800 border-b border-gray-700">
    <n-button quaternary size="small" @click="$emit('open-repo')">
      <template #icon><n-icon><folder-open-outlined /></n-icon></template>
    </n-button>
    <n-button quaternary size="small" @click="$emit('clone-repo')">
      <template #icon><n-icon><copy-outlined /></n-icon></template>
    </n-button>
    <n-divider vertical />
    <n-button quaternary size="small" @click="$emit('fetch')">
      <template #icon><n-icon><cloud-download-outlined /></n-icon></template>
    </n-button>
    <n-button quaternary size="small" @click="$emit('pull')">
      <template #icon><n-icon><down-outlined /></n-icon></template>
    </n-button>
    <n-button quaternary size="small" @click="$emit('push')">
      <template #icon><n-icon><up-outlined /></n-icon></template>
    </n-button>
    <div class="flex-1" />
    <n-button quaternary size="small" @click="toggleTheme">
      <template #icon><n-icon><moon-outlined v-if="app.theme === 'dark'" /><sun-outlined v-else /></n-icon></template>
    </n-button>
  </div>
</template>

<script setup lang="ts">
import { NButton, NIcon, NDivider } from 'naive-ui'
import { useAppStore } from '../../stores/app'
import { useTheme } from '../../composables/useTheme'

defineEmits(['open-repo', 'clone-repo', 'fetch', 'pull', 'push'])

const app = useAppStore()
const { toggleTheme } = useTheme()
</script>
```

注意：图标先用文字替代，后续替换为@vicons/antd。

- [ ] **Step 2: 简化版本（无图标依赖）**

`src/components/layout/Toolbar.vue`（不依赖@vicons）：
```vue
<template>
  <div class="h-10 flex items-center px-3 bg-gray-800 border-b border-gray-700 gap-1">
    <n-button quaternary size="small" @click="$emit('open-repo')">Open</n-button>
    <n-button quaternary size="small" @click="$emit('clone-repo')">Clone</n-button>
    <n-divider vertical />
    <n-button quaternary size="small" @click="$emit('fetch')">Fetch</n-button>
    <n-button quaternary size="small" @click="$emit('pull')">Pull</n-button>
    <n-button quaternary size="small" @click="$emit('push')">Push</n-button>
    <div class="flex-1" />
    <n-button quaternary size="small" @click="toggleTheme">{{ app.theme === 'dark' ? '🌙' : '☀️' }}</n-button>
  </div>
</template>

<script setup lang="ts">
import { NButton, NDivider } from 'naive-ui'
import { useAppStore } from '../../stores/app'
import { useTheme } from '../../composables/useTheme'

defineEmits(['open-repo', 'clone-repo', 'fetch', 'pull', 'push'])

const app = useAppStore()
const { toggleTheme } = useTheme()
</script>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/Toolbar.vue
git commit -m "feat: add Toolbar with repo/remote actions and theme toggle"
```

---

### Task 3: 实现Sidebar

**Files:**
- Modify: `src/components/layout/Sidebar.vue`

- [ ] **Step 1: 写Sidebar**

`src/components/layout/Sidebar.vue`:
```vue
<template>
  <div
    class="bg-gray-850 border-r border-gray-700 flex flex-col overflow-hidden transition-all duration-200"
    :style="{ width: app.sidebarCollapsed ? '48px' : app.sidebarWidth + 'px' }"
  >
    <div class="p-2 flex items-center justify-between border-b border-gray-700">
      <span v-if="!app.sidebarCollapsed" class="text-xs text-gray-400 uppercase tracking-wide">Explorer</span>
      <n-button quaternary size="tiny" @click="app.toggleSidebar">
        {{ app.sidebarCollapsed ? '▸' : '◂' }}
      </n-button>
    </div>

    <div v-if="!app.sidebarCollapsed" class="flex-1 overflow-y-auto">
      <div class="p-2">
        <div class="text-xs text-gray-500 mb-1">Branches</div>
        <BranchTree />
      </div>
      <div class="p-2 border-t border-gray-700">
        <div class="text-xs text-gray-500 mb-1">Remotes</div>
        <RemotePanel />
      </div>
      <div class="p-2 border-t border-gray-700">
        <div class="text-xs text-gray-500 mb-1">Stash</div>
        <div class="text-xs text-gray-600">No stash entries</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { NButton } from 'naive-ui'
import { useAppStore } from '../../stores/app'
import BranchTree from '../branch/BranchTree.vue'
import RemotePanel from '../remote/RemotePanel.vue'

const app = useAppStore()
</script>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/Sidebar.vue
git commit -m "feat: add Sidebar with branches/remotes/stash sections"
```

---

### Task 4: 实现StatusBar

**Files:**
- Modify: `src/components/layout/StatusBar.vue`

- [ ] **Step 1: 写StatusBar**

`src/components/layout/StatusBar.vue`:
```vue
<template>
  <div class="h-6 flex items-center px-3 bg-gray-800 border-t border-gray-700 text-xs text-gray-400 gap-4">
    <span v-if="repo.currentRepo" class="text-blue-400">
      ⑂ {{ branches.currentBranch || 'detached' }}
    </span>
    <span v-if="repo.currentRepo">
      {{ repo.currentRepo.head_commit_id?.slice(0, 7) || 'no commits' }}
    </span>
    <span v-if="remote.syncing" class="text-yellow-400">Syncing...</span>
    <div class="flex-1" />
    <span v-if="repo.currentRepo">{{ repo.repoPath }}</span>
  </div>
</template>

<script setup lang="ts">
import { useRepoStore } from '../../stores/repo'
import { useBranchesStore } from '../../stores/branches'
import { useRemoteStore } from '../../stores/remote'

const repo = useRepoStore()
const branches = useBranchesStore()
const remote = useRemoteStore()
</script>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/StatusBar.vue
git commit -m "feat: add StatusBar with branch/commit/sync status"
```

---

### Task 5: 实现RepoPanel + CloneDialog

**Files:**
- Modify: `src/components/repo/RepoPanel.vue`
- Modify: `src/components/repo/RepoList.vue`
- Modify: `src/components/repo/CloneDialog.vue`

- [ ] **Step 1: 写RepoPanel**

`src/components/repo/RepoPanel.vue`:
```vue
<template>
  <div class="p-4">
    <n-button type="primary" block @click="$emit('open')">Open Repository</n-button>
    <n-button block class="mt-2" @click="showClone = true">Clone Repository</n-button>
    <CloneDialog v-model:show="showClone" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { NButton } from 'naive-ui'
import CloneDialog from './CloneDialog.vue'

defineEmits(['open'])
const showClone = ref(false)
</script>
```

- [ ] **Step 2: 写CloneDialog**

`src/components/repo/CloneDialog.vue`:
```vue
<template>
  <n-modal v-model:show="show" preset="dialog" title="Clone Repository">
    <n-form>
      <n-form-item label="URL">
        <n-input v-model:value="url" placeholder="https://github.com/user/repo.git" />
      </n-form-item>
      <n-form-item label="Local Path">
        <n-input v-model:value="path" placeholder="/path/to/clone" />
      </n-form-item>
    </n-form>
    <template #action>
      <n-button @click="show = false">Cancel</n-button>
      <n-button type="primary" :loading="loading" @click="doClone">Clone</n-button>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { NModal, NForm, NFormItem, NInput, NButton, useMessage } from 'naive-ui'
import { useRepoStore } from '../../stores/repo'

const show = defineModel<boolean>('show', { default: false })
const url = ref('')
const path = ref('')
const loading = ref(false)
const repo = useRepoStore()
const message = useMessage()

async function doClone() {
  if (!url.value || !path.value) return
  loading.value = true
  try {
    await repo.cloneRepo(url.value, path.value)
    show.value = false
    message.success('Clone successful')
  } catch (e) {
    message.error(String(e))
  } finally {
    loading.value = false
  }
}
</script>
```

- [ ] **Step 3: 写RepoList**

`src/components/repo/RepoList.vue`:
```vue
<template>
  <div class="text-xs text-gray-500 p-2">
    No recent repositories
  </div>
</template>

<script setup lang="ts">
</script>
```

- [ ] **Step 4: 验证构建**

Run:
```powershell
cd d:\projects\req2task-2\git-client
npx vite build
```

Expected: 成功

- [ ] **Step 5: Commit**

```bash
git add src/components/repo/
git commit -m "feat: add RepoPanel, CloneDialog, RepoList components"
```
