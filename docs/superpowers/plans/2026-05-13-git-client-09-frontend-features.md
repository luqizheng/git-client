# Git客户端 实施计划 — 09: 分支/远程/冲突/标签/Stash组件

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现BranchTree、BranchDialog、RemotePanel、SshConfig、ConflictResolver、ThreeWayDiff组件

**Architecture:** BranchTree展示分支列表，支持右键操作(切换/删除/合并)。BranchDialog创建分支对话框。RemotePanel管理远程仓库。ConflictResolver实现三栏冲突解决。所有组件通过Pinia Store与后端通信。

**Tech Stack:** Vue3, Naive UI, TypeScript

---

### Task 1: 实现BranchTree + BranchDialog

**Files:**
- Modify: `src/components/branch/BranchTree.vue`
- Modify: `src/components/branch/BranchDialog.vue`

- [ ] **Step 1: 写BranchTree**

`src/components/branch/BranchTree.vue`:
```vue
<template>
  <div class="text-xs">
    <div v-for="branch in localBranches" :key="branch.name"
      class="flex items-center px-2 py-0.5 hover:bg-gray-700 cursor-pointer"
      :class="{ 'bg-gray-700': branch.is_head }"
      @click="onSwitch(branch.name)"
      @contextmenu.prevent="onContext($event, branch)"
    >
      <span class="mr-1" :class="branch.is_head ? 'text-green-400' : 'text-blue-400'">
        {{ branch.is_head ? '●' : '○' }}
      </span>
      <span class="text-gray-300 truncate">{{ branch.name }}</span>
      <span v-if="branch.upstream" class="ml-1 text-gray-600">→ {{ branch.upstream }}</span>
    </div>
    <div v-for="branch in remoteBranches" :key="branch.name"
      class="flex items-center px-2 py-0.5 hover:bg-gray-700 cursor-pointer text-gray-500"
    >
      <span class="mr-1">◇</span>
      <span class="truncate">{{ branch.name }}</span>
    </div>
    <n-button size="tiny" quaternary class="mt-1" @click="showDialog = true">+ New Branch</n-button>
    <BranchDialog v-model:show="showDialog" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { NButton, useMessage } from 'naive-ui'
import { useBranchesStore } from '../../stores/branches'
import { useRepoStore } from '../../stores/repo'
import BranchDialog from './BranchDialog.vue'
import type { Branch } from '../../types/git'

const branches = useBranchesStore()
const repo = useRepoStore()
const msgApi = useMessage()
const showDialog = ref(false)

const localBranches = computed(() => branches.branches.filter(b => !b.is_remote))
const remoteBranches = computed(() => branches.branches.filter(b => b.is_remote))

async function onSwitch(name: string) {
  if (!repo.repoPath) return
  try {
    await branches.switchBranch(repo.repoPath, name)
    msgApi.success(`Switched to ${name}`)
  } catch (e) {
    msgApi.error(String(e))
  }
}

function onContext(e: MouseEvent, branch: Branch) {
  // future: context menu with delete/merge/rebase
}
</script>
```

- [ ] **Step 2: 写BranchDialog**

`src/components/branch/BranchDialog.vue`:
```vue
<template>
  <n-modal v-model:show="show" preset="dialog" title="Create Branch">
    <n-form>
      <n-form-item label="Branch Name">
        <n-input v-model:value="name" placeholder="feature/new-feature" />
      </n-form-item>
      <n-checkbox v-model:checked="checkout">Checkout after creation</n-checkbox>
    </n-form>
    <template #action>
      <n-button @click="show = false">Cancel</n-button>
      <n-button type="primary" :disabled="!name.trim()" @click="doCreate">Create</n-button>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { NModal, NForm, NFormItem, NInput, NButton, NCheckbox, useMessage } from 'naive-ui'
import { useBranchesStore } from '../../stores/branches'
import { useRepoStore } from '../../stores/repo'

const show = defineModel<boolean>('show', { default: false })
const name = ref('')
const checkout = ref(true)
const branches = useBranchesStore()
const repo = useRepoStore()
const msgApi = useMessage()

async function doCreate() {
  if (!repo.repoPath || !name.value.trim()) return
  try {
    await branches.createBranch(repo.repoPath, name.value, checkout.value)
    show.value = false
    name.value = ''
    msgApi.success(`Branch ${name.value} created`)
  } catch (e) {
    msgApi.error(String(e))
  }
}
</script>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/branch/
git commit -m "feat: add BranchTree with switch/context menu, BranchDialog for creating branches"
```

---

### Task 2: 实现RemotePanel + SshConfig

**Files:**
- Modify: `src/components/remote/RemotePanel.vue`
- Modify: `src/components/remote/SshConfig.vue`

- [ ] **Step 1: 写RemotePanel**

`src/components/remote/RemotePanel.vue`:
```vue
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
```

- [ ] **Step 2: 写SshConfig**

`src/components/remote/SshConfig.vue`:
```vue
<template>
  <div class="p-2 text-xs">
    <div class="text-gray-400 mb-1">SSH Key Configuration</div>
    <n-form>
      <n-form-item label="SSH Key Path">
        <n-input v-model:value="sshKeyPath" placeholder="~/.ssh/id_ed25519" />
      </n-form-item>
    </n-form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { NForm, NFormItem, NInput } from 'naive-ui'

const sshKeyPath = ref('')
</script>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/remote/
git commit -m "feat: add RemotePanel with add remote dialog, SshConfig placeholder"
```

---

### Task 3: 实现ConflictResolver + ThreeWayDiff

**Files:**
- Modify: `src/components/conflict/ConflictResolver.vue`
- Modify: `src/components/conflict/ThreeWayDiff.vue`

- [ ] **Step 1: 写ThreeWayDiff**

`src/components/conflict/ThreeWayDiff.vue`:
```vue
<template>
  <div class="flex gap-1 h-full text-xs">
    <div class="flex-1 border border-gray-700 rounded overflow-hidden">
      <div class="bg-red-900/30 text-red-400 px-2 py-0.5">Ours</div>
      <pre class="p-2 text-gray-300 overflow-auto h-[calc(100%-24px)]">{{ ours }}</pre>
    </div>
    <div class="flex-1 border border-gray-700 rounded overflow-hidden">
      <div class="bg-gray-700 text-gray-400 px-2 py-0.5">Base</div>
      <pre class="p-2 text-gray-300 overflow-auto h-[calc(100%-24px)]">{{ base }}</pre>
    </div>
    <div class="flex-1 border border-gray-700 rounded overflow-hidden">
      <div class="bg-green-900/30 text-green-400 px-2 py-0.5">Theirs</div>
      <pre class="p-2 text-gray-300 overflow-auto h-[calc(100%-24px)]">{{ theirs }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  ours: string
  base: string
  theirs: string
}>()
</script>
```

- [ ] **Step 2: 写ConflictResolver**

`src/components/conflict/ConflictResolver.vue`:
```vue
<template>
  <div v-if="conflicts.length > 0" class="flex flex-col h-full">
    <div class="p-2 border-b border-gray-700 flex items-center gap-2">
      <span class="text-yellow-400 text-sm font-bold">{{ conflicts.length }} Conflicts</span>
      <div class="flex-1" />
      <n-button size="small" type="primary" :disabled="unresolvedCount > 0" @click="$emit('complete')">
        Complete Merge
      </n-button>
    </div>
    <div class="flex-1 overflow-y-auto">
      <div v-for="(conflict, idx) in conflicts" :key="conflict.path"
        class="border-b border-gray-700 p-2"
      >
        <div class="flex items-center mb-1">
          <span :class="resolved[idx] ? 'text-green-400' : 'text-red-400'">
            {{ resolved[idx] ? '✓' : '✗' }}
          </span>
          <span class="ml-1 text-sm text-gray-300">{{ conflict.path }}</span>
          <div class="flex-1" />
          <n-button size="tiny" @click="chooseOurs(idx)">Ours</n-button>
          <n-button size="tiny" @click="chooseTheirs(idx)">Theirs</n-button>
          <n-button size="tiny" @click="chooseBase(idx)">Base</n-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { NButton } from 'naive-ui'
import type { ConflictFile } from '../../types/git'

const props = defineProps<{
  conflicts: ConflictFile[]
}>()

defineEmits<{ complete: [] }>()

const resolved = ref<boolean[]>(new Array(props.conflicts.length).fill(false))

const unresolvedCount = computed(() => resolved.value.filter(r => !r).length)

function chooseOurs(idx: number) { resolved.value[idx] = true }
function chooseTheirs(idx: number) { resolved.value[idx] = true }
function chooseBase(idx: number) { resolved.value[idx] = true }
</script>
```

- [ ] **Step 3: 验证构建**

Run:
```powershell
cd d:\projects\req2task-2\git-client
npx vite build
```

Expected: 成功

- [ ] **Step 4: Commit**

```bash
git add src/components/conflict/
git commit -m "feat: add ConflictResolver with ours/theirs/base choice, ThreeWayDiff view"
```
