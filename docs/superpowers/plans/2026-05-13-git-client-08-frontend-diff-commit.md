# Git客户端 实施计划 — 08: Diff查看器 + 提交面板

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现Monaco Diff查看器(side-by-side/unified)、文件树、StageArea暂存区、CommitEditor提交编辑器

**Architecture:** DiffView.vue组合FileTree+MonacoDiff。MonacoDiff封装Monaco Editor diff模式。StageArea展示暂存/未暂存文件列表。CommitEditor支持Conventional Commits模板(DX7)。

**Tech Stack:** Vue3, Monaco Editor, Naive UI, TypeScript

---

### Task 1: 实现MonacoDiff组件

**Files:**
- Modify: `src/components/diff/MonacoDiff.vue`

- [ ] **Step 1: 写MonacoDiff**

`src/components/diff/MonacoDiff.vue`:
```vue
<template>
  <div ref="containerRef" class="w-full h-full" />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as monaco from 'monaco-editor'

const props = defineProps<{
  original: string
  modified: string
  language?: string
  renderSideBySide?: boolean
  readOnly?: boolean
}>()

const emit = defineEmits<{
  'update:modified': [value: string]
}>()

const containerRef = ref<HTMLElement | null>(null)
let editor: monaco.editor.IDiffEditor | null = null

onMounted(() => {
  if (!containerRef.value) return

  editor = monaco.editor.createDiffEditor(containerRef.value, {
    theme: 'vs-dark',
    renderSideBySide: props.renderSideBySide ?? true,
    readOnly: props.readOnly ?? true,
    automaticLayout: true,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
  })

  const originalModel = monaco.editor.createModel(props.original, props.language ?? 'plaintext')
  const modifiedModel = monaco.editor.createModel(props.modified, props.language ?? 'plaintext')

  editor.setModel({ original: originalModel, modified: modifiedModel })

  if (!props.readOnly) {
    modifiedModel.onDidChangeContent(() => {
      emit('update:modified', modifiedModel.getValue())
    })
  }
})

watch(() => [props.original, props.modified], () => {
  if (!editor) return
  const model = editor.getModel()
  if (!model) return
  model.original.setValue(props.original)
  model.modified.setValue(props.modified)
})

watch(() => props.renderSideBySide, (val) => {
  editor?.updateOptions({ renderSideBySide: val ?? true })
})

onUnmounted(() => {
  editor?.dispose()
})

function goToNextChange() {
  editor?.goToDiff('next')
}

function goToPrevChange() {
  editor?.goToDiff('previous')
}

defineExpose({ goToNextChange, goToPrevChange })
</script>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/diff/MonacoDiff.vue
git commit -m "feat: add MonacoDiff component with side-by-side/unified, diff navigation"
```

---

### Task 2: 实现FileTree组件

**Files:**
- Modify: `src/components/diff/FileTree.vue`

- [ ] **Step 1: 写FileTree**

`src/components/diff/FileTree.vue`:
```vue
<template>
  <div class="text-xs overflow-y-auto h-full">
    <div
      v-for="file in files"
      :key="file.path"
      class="flex items-center px-2 py-1 cursor-pointer hover:bg-gray-700"
      :class="{ 'bg-gray-700': selected === file.path }"
      @click="$emit('select', file.path)"
    >
      <span class="w-4 text-center mr-1" :class="statusColor(file.status)">
        {{ statusIcon(file.status) }}
      </span>
      <span class="truncate text-gray-300">{{ file.path }}</span>
    </div>
    <div v-if="files.length === 0" class="text-gray-600 p-2">No changes</div>
  </div>
</template>

<script setup lang="ts">
import type { FileDiff, DiffStatus } from '../../types/git'

defineProps<{
  files: FileDiff[]
  selected: string | null
}>()

defineEmits<{ select: [path: string] }>()

function statusIcon(status: DiffStatus): string {
  switch (status) {
    case 'Added': return 'A'
    case 'Modified': return 'M'
    case 'Deleted': return 'D'
    case 'Renamed': return 'R'
    case 'Copied': return 'C'
  }
}

function statusColor(status: DiffStatus): string {
  switch (status) {
    case 'Added': return 'text-green-400'
    case 'Modified': return 'text-yellow-400'
    case 'Deleted': return 'text-red-400'
    case 'Renamed': return 'text-blue-400'
    case 'Copied': return 'text-blue-400'
  }
}
</script>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/diff/FileTree.vue
git commit -m "feat: add FileTree component with status icons and colors"
```

---

### Task 3: 实现DiffView组合组件

**Files:**
- Modify: `src/components/diff/DiffView.vue`

- [ ] **Step 1: 写DiffView**

`src/components/diff/DiffView.vue`:
```vue
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/diff/DiffView.vue
git commit -m "feat: add DiffView combining FileTree and MonacoDiff with split/unified toggle"
```

---

### Task 4: 实现StageArea组件

**Files:**
- Modify: `src/components/commit/StageArea.vue`

- [ ] **Step 1: 写StageArea**

`src/components/commit/StageArea.vue`:
```vue
<template>
  <div class="text-xs">
    <div class="p-2 border-b border-gray-700">
      <div class="text-gray-400 mb-1">Staged Changes ({{ staging.stagedFiles.length }})</div>
      <div
        v-for="file in staging.stagedFiles"
        :key="'staged-' + file.path"
        class="flex items-center px-2 py-0.5 hover:bg-gray-700 cursor-pointer"
      >
        <n-button size="tiny" quaternary @click.stop="unstage(file.path)">−</n-button>
        <span class="ml-1 text-green-400">{{ statusIcon(file.status) }}</span>
        <span class="ml-1 text-gray-300 truncate">{{ file.path }}</span>
      </div>
    </div>
    <div class="p-2">
      <div class="text-gray-400 mb-1">Changes ({{ staging.unstagedFiles.length }})</div>
      <div
        v-for="file in staging.unstagedFiles"
        :key="'unstaged-' + file.path"
        class="flex items-center px-2 py-0.5 hover:bg-gray-700 cursor-pointer"
      >
        <n-button size="tiny" quaternary @click.stop="stage(file.path)">+</n-button>
        <span class="ml-1 text-yellow-400">{{ statusIcon(file.status) }}</span>
        <span class="ml-1 text-gray-300 truncate">{{ file.path }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { NButton } from 'naive-ui'
import { useStagingStore } from '../../stores/staging'
import { useRepoStore } from '../../stores/repo'
import type { DiffStatus } from '../../types/git'

const staging = useStagingStore()
const repo = useRepoStore()

function statusIcon(status: DiffStatus): string {
  switch (status) {
    case 'Added': return 'A'
    case 'Modified': return 'M'
    case 'Deleted': return 'D'
    case 'Renamed': return 'R'
    case 'Copied': return 'C'
  }
}

async function stage(path: string) {
  if (!repo.repoPath) return
  await staging.stageFiles(repo.repoPath, [path])
  await staging.refresh(repo.repoPath)
}

async function unstage(path: string) {
  if (!repo.repoPath) return
  await staging.unstageFiles(repo.repoPath, [path])
  await staging.refresh(repo.repoPath)
}
</script>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/commit/StageArea.vue
git commit -m "feat: add StageArea with stage/unstage file actions"
```

---

### Task 5: 实现CommitEditor + CommitPanel

**Files:**
- Modify: `src/components/commit/CommitEditor.vue`
- Modify: `src/components/commit/CommitPanel.vue`

- [ ] **Step 1: 写CommitEditor**

`src/components/commit/CommitEditor.vue`:
```vue
<template>
  <div class="p-2 border-t border-gray-700">
    <div class="flex gap-1 mb-1">
      <n-select
        v-model:value="template"
        :options="templateOptions"
        size="tiny"
        class="w-32"
        @update:value="applyTemplate"
      />
    </div>
    <n-input
      v-model:value="message"
      type="textarea"
      :rows="4"
      placeholder="Commit message..."
      class="text-sm"
    />
    <div class="flex items-center gap-1 mt-1">
      <n-checkbox v-model:checked="amend">Amend</n-checkbox>
      <div class="flex-1" />
      <n-button type="primary" size="small" :disabled="!message.trim()" @click="doCommit">
        Commit (Ctrl+S)
      </n-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { NInput, NButton, NSelect, NCheckbox, useMessage } from 'naive-ui'
import { invoke } from '../../utils/ipc'
import { useRepoStore } from '../../stores/repo'
import { useCommitsStore } from '../../stores/commits'
import type { Commit } from '../../types/git'

const repo = useRepoStore()
const commits = useCommitsStore()
const message = ref('')
const amend = ref(false)
const template = ref(null as string | null)
const msgApi = useMessage()

const templateOptions = [
  { label: 'feat:', value: 'feat: ' },
  { label: 'fix:', value: 'fix: ' },
  { label: 'docs:', value: 'docs: ' },
  { label: 'refactor:', value: 'refactor: ' },
  { label: 'chore:', value: 'chore: ' },
]

function applyTemplate(val: string) {
  if (!message.value.startsWith(val)) {
    message.value = val + message.value.replace(/^(feat|fix|docs|refactor|chore):\s*/, '')
  }
}

async function doCommit() {
  if (!repo.repoPath || !message.value.trim()) return
  try {
    await invoke<Commit>('commit', {
      repoPath: repo.repoPath,
      message: message.value,
      amend: amend.value,
    })
    message.value = ''
    amend.value = false
    msgApi.success('Committed')
    await commits.fetchLogs(repo.repoPath)
  } catch (e) {
    msgApi.error(String(e))
  }
}
</script>
```

- [ ] **Step 2: 写CommitPanel**

`src/components/commit/CommitPanel.vue`:
```vue
<template>
  <div class="border-l border-gray-700 flex flex-col" style="width: 320px;">
    <div class="p-2 text-xs text-gray-400 border-b border-gray-700 uppercase">Changes</div>
    <StageArea class="flex-1 overflow-y-auto" />
    <CommitEditor />
  </div>
</template>

<script setup lang="ts">
import StageArea from './StageArea.vue'
import CommitEditor from './CommitEditor.vue'
</script>
```

- [ ] **Step 3: 更新App.vue集成CommitPanel**

`src/App.vue` 添加CommitPanel：
```vue
<template>
  <AppLayout>
    <div class="flex-1 flex overflow-hidden">
      <GraphView />
      <DiffView />
      <CommitPanel />
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import AppLayout from './components/layout/AppLayout.vue'
import GraphView from './components/graph/GraphView.vue'
import DiffView from './components/diff/DiffView.vue'
import CommitPanel from './components/commit/CommitPanel.vue'
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
git add src/components/commit/ src/App.vue
git commit -m "feat: add CommitEditor with Conventional Commits templates, CommitPanel, StageArea integration"
```
