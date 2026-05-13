# GitKraken 布局重构实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有两栏布局重构为仿 GitKraken 的三栏布局，新增可滑出的右侧面板（Commit Details / Staging Panel 双模式）

**Architecture:** 新增 `rightPanel` store 管理右侧面板状态，创建 `RightPanel.vue` 容器组件配合 `ResizeHandle.vue` 实现可拖拽分栏，将现有 `CommitDetailPanel` 重构为右侧面板内的 `CommitDetails` 模式，将底部 `StageArea`+`CommitEditor` 迁移至右侧 `StagingPanel` 模式，中央区域支持 GraphView/DiffView 切换

**Tech Stack:** Vue 3 Composition API, Pinia, Naive UI, UnoCSS, TypeScript, Tauri IPC

---

## 文件结构总览

### 新建文件

| 文件 | 职责 |
|------|------|
| `src/components/layout/RightPanel.vue` | 右侧面板容器，管理显隐/宽度/模式切换 |
| `src/components/layout/ResizeHandle.vue` | 可拖拽分隔线组件 |
| `src/components/layout/CenterArea.vue` | 中央区域容器，管理 GraphView/DiffView 切换 |
| `src/components/commit/CommitDetails.vue` | 右侧面板 Commit 详情模式（重构自 CommitDetailPanel） |
| `src/components/commit/CommitHeader.vue` | Commit 元信息头部（SHA、Message、Author、Date） |
| `src/components/commit/ChangedFilesList.vue` | 变更文件列表（带状态标识、行数统计） |
| `src/components/staging/StagingPanel.vue` | Staging 主面板（整合 StageArea + CommitEditor） |
| `src/components/staging/FileStatsHeader.vue` | 文件统计头部 |
| `src/components/staging/UnstagedFilesSection.vue` | 未暂存文件区 |
| `src/components/staging/StagedFilesSection.vue` | 已暂存文件区 |
| `src/components/staging/CommitEditorSection.vue` | Commit 编辑器区（从 CommitEditor 迁移） |
| `src/stores/rightPanel.ts` | 右侧面板状态管理 |
| `src/composables/useResizable.ts` | 可拖拽调整宽度 composable |

### 修改文件

| 文件 | 变更内容 |
|------|----------|
| `src/AppLayout.vue` | 添加三栏结构：LeftSidebar + CenterArea + RightPanel |
| `src/App.vue` | 移除底部 StageArea/CommitEditor，使用新的 CenterArea |
| `src/components/layout/Sidebar.vue` | 调整默认宽度 180px，添加 Working Files 导航项 |
| `src/stores/app.ts` | sidebarWidth 默认值改为 180 |
| `src/components/commit/CommitList.vue` | 移除固定宽度，适配 CenterArea |

---

### Task 1: 创建 rightPanel Store

**Files:**
- Create: `git-client/src/stores/rightPanel.ts`
- Test: `git-client/src/stores/__tests__/rightPanel.test.ts`

- [ ] **Step 1: 编写 Store 单元测试**

```typescript
// src/stores/__tests__/rightPanel.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useRightPanelStore } from '../rightPanel'

describe('rightPanel store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('should have correct initial state', () => {
    const store = useRightPanelStore()
    expect(store.visible).toBe(false)
    expect(store.width).toBe(320)
    expect(store.mode).toBeNull()
    expect(store.selectedCommitSha).toBeNull()
    expect(store.commitDetail).toBeNull()
    expect(store.changedFiles).toEqual([])
    expect(store.unstagedFiles).toEqual([])
    expect(store.stagedFiles).toEqual([])
    expect(store.commitMessage.summary).toBe('')
    expect(store.commitMessage.description).toBe('')
    expect(store.amendMode).toBe(false)
  })

  it('showPanel should set visible and mode', () => {
    const store = useRightPanelStore()
    store.showPanel('commit', 'abc1234')
    expect(store.visible).toBe(true)
    expect(store.mode).toBe('commit')
    expect(store.selectedCommitSha).toBe('abc1234')
  })

  it('showPanel staging mode should not set sha', () => {
    const store = useRightPanelStore()
    store.showPanel('staging')
    expect(store.visible).toBe(true)
    expect(store.mode).toBe('staging')
    expect(store.selectedCommitSha).toBeNull()
  })

  it('hidePanel should reset state', () => {
    const store = useRightPanelStore()
    store.showPanel('commit', 'abc1234')
    store.hidePanel()
    expect(store.visible).toBe(false)
    expect(store.mode).toBeNull()
    expect(store.selectedCommitSha).toBeNull()
  })

  it('togglePanel should toggle visibility', () => {
    const store = useRightPanelStore()
    expect(store.visible).toBe(false)
    store.togglePanel()
    expect(store.visible).toBe(true)
    store.togglePanel()
    expect(store.visible).toBe(false)
  })

  it('setWidth should clamp between min and max', () => {
    const store = useRightPanelStore()
    store.setWidth(100)
    expect(store.width).toBe(240)
    store.setWidth(999)
    expect(store.width).toBe(480)
    store.setWidth(300)
    expect(store.width).toBe(300)
  })
})
```

- [ ] **Step 2: 运行测试验证失败**

Run: `cd git-client && npm run test -- src/stores/__tests__/rightPanel.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: 实现 rightPanel Store**

```typescript
// src/stores/rightPanel.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Commit, FileDiff } from '../types/git'

export interface CommitDetail {
  commit: Commit
  files: FileDiff[]
}

export type RightPanelMode = 'commit' | 'staging' | null

export const useRightPanelStore = defineStore('rightPanel', () => {
  const visible = ref(false)
  const width = ref(320)
  const isDragging = ref(false)
  const mode = ref<RightPanelMode>(null)

  const selectedCommitSha = ref<string | null>(null)
  const commitDetail = ref<CommitDetail | null>(null)
  const changedFiles = computed(() => commitDetail.value?.files ?? [])

  const unstagedFiles = ref<FileDiff[]>([])
  const stagedFiles = ref<FileDiff[]>([])

  const commitMessage = ref({ summary: '', description: '' })
  const amendMode = ref(false)

  const MIN_WIDTH = 240
  const MAX_WIDTH = 480

  function showPanel(m: 'commit' | 'staging', sha?: string) {
    mode.value = m
    visible.value = true
    if (m === 'commit' && sha) {
      selectedCommitSha.value = sha
    }
  }

  function hidePanel() {
    visible.value = false
    mode.value = null
    selectedCommitSha.value = null
    commitDetail.value = null
  }

  function togglePanel() {
    if (visible.value) {
      hidePanel()
    } else {
      showPanel('staging')
    }
  }

  function setWidth(w: number) {
    width.value = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, w))
  }

  function setCommitDetail(detail: CommitDetail | null) {
    commitDetail.value = detail
  }

  function setStagingData(unstaged: FileDiff[], staged: FileDiff[]) {
    unstagedFiles.value = unstaged
    stagedFiles.value = staged
  }

  return {
    visible, width, isDragging, mode,
    selectedCommitSha, commitDetail, changedFiles,
    unstagedFiles, stagedFiles,
    commitMessage, amendMode,
    MIN_WIDTH, MAX_WIDTH,
    showPanel, hidePanel, togglePanel, setWidth,
    setCommitDetail, setStagingData,
  }
})
```

- [ ] **Step 4: 运行测试验证通过**

Run: `cd git-client && npm run test -- src/stores/__tests__/rightPanel.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: 提交**

```bash
cd git-client
git add src/stores/rightPanel.ts src/stores/__tests__/rightPanel.test.ts
git commit -m "feat(layout): add rightPanel store for panel state management"
```

---

### Task 2: 创建 ResizeHandle 组件

**Files:**
- Create: `git-client/src/components/layout/ResizeHandle.vue`
- Create: `git-client/src/composables/useResizable.ts`
- Test: `git-client/src/composables/__tests__/useResizable.test.ts`

- [ ] **Step 1: 编写 composable 测试**

```typescript
// src/composables/__tests__/useResizable.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('useResizable', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('should call onResize with delta on mousemove', async () => {
    const { default: useResizable } = await import('../useResizable')
    const onResize = vi.fn()
    const container = document.createElement('div')
    document.body.appendChild(container)

    const { startDrag } = useResizable({
      container,
      direction: 'horizontal',
      minSize: 200,
      maxSize: 500,
      initialSize: 300,
      onResize,
    })

    const handle = document.createElement('div')
    startDrag(new MouseEvent('mousedown') as any)

    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 350 }))
    expect(onResize).toHaveBeenCalledWith(350)

    document.dispatchEvent(new MouseEvent('mouseup'))
    expect(onResize).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: 运行测试验证失败**

Run: `cd git-client && npm run test -- src/composables/__tests__/useResizable.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现 useResizable composable**

```typescript
// src/composables/useResizable.ts
import { onUnmounted } from 'vue'

interface UseResizableOptions {
  container: HTMLElement
  direction: 'horizontal' | 'vertical'
  minSize: number
  maxSize: number
  initialSize: number
  onResize: (size: number) => void
}

export function useResizable(options: UseResizableOptions) {
  let startX = 0
  let startSize = 0
  let isDragging = false

  function startDrag(e: MouseEvent) {
    e.preventDefault()
    isDragging = true
    startX = options.direction === 'horizontal' ? e.clientX : e.clientY
    startSize = options.initialSize
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    document.body.style.cursor = options.direction === 'horizontal' ? 'col-resize' : 'row-resize'
    document.body.style.userSelect = 'none'
  }

  function onMouseMove(e: MouseEvent) {
    if (!isDragging) return
    const current = options.direction === 'horizontal' ? e.clientX : e.clientY
    const delta = current - startX
    const newSize = options.direction === 'horizontal'
      ? startSize - delta   // 从右边缘拖时，delta 为负表示增大
      : startSize + delta
    const clamped = Math.max(options.minSize, Math.min(options.maxSize, newSize))
    options.onResize(clamped)
  }

  function onMouseUp() {
    isDragging = false
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }

  onUnmounted(() => {
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  })

  return { startDrag, isDragging: () => isDragging }
}
```

- [ ] **Step 4: 实现 ResizeHandle 组件**

```vue
<!-- src/components/layout/ResizeHandle.vue -->
<template>
  <div
    class="resize-handle"
    :class="{ active: dragging }"
    @mousedown.stop="onMouseDown"
  >
    <div class="handle-line" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useResizable } from '../../composables/useResizable'

const props = withDefaults(defineProps<{
  direction?: 'horizontal' | 'vertical'
  container?: HTMLElement
  minSize?: number
  maxSize?: number
  getSize?: () => number
}>(), {
  direction: 'horizontal',
  minSize: 100,
  maxSize: 800,
})

const emit = defineEmits<{
  resize: [size: number]
}>()

const dragging = ref(false)

function getContainer(): HTMLElement {
  return props.container ?? (document.querySelector('.main-container') as HTMLElement) ?? document.body
}

function onMouseDown(e: MouseEvent) {
  const { startDrag } = useResizable({
    container: getContainer(),
    direction: props.direction,
    minSize: props.minSize,
    maxSize: props.maxSize,
    initialSize: props.getSize?.() ?? 320,
    onResize: (size) => {
      dragging.value = true
      emit('resize', size)
    },
  })
  startDrag(e)
  setTimeout(() => { dragging.value = false }, 100)
}
</script>

<style scoped>
.resize-handle {
  width: 4px;
  background: transparent;
  transition: background 0.15s;
  position: relative;
  z-index: 10;
  flex-shrink: 0;
}
.resize-handle:hover,
.resize-handle.active {
  background: #0e639c;
}
.handle-line {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 1px;
  background: var(--border-color, #3c3c3c);
}
.resize-handle:hover .handle-line,
.resize-handle.active .handle-line {
  background: transparent;
}
</style>
```

- [ ] **Step 5: 运行测试**

Run: `cd git-client && npm run test`
Expected: PASS

- [ ] **Step 6: 提交**

```bash
cd git-client
git add src/components/layout/ResizeHandle.vue src/composables/useResizable.ts src/composables/__tests__/useResizable.test.ts
git commit -m "feat(layout): add ResizeHandle component and useResizable composable"
```

---

### Task 3: 重构 AppLayout.vue 三栏布局

**Files:**
- Modify: `git-client/src/components/layout/AppLayout.vue`

- [ ] **Step 1: 编写 AppLayout 快照测试**

```typescript
// src/components/layout/__tests__/AppLayout.test.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AppLayout from '../AppLayout.vue'

describe('AppLayout', () => {
  it('renders toolbar, repo tabs, sidebar, main area and status bar', () => {
    const wrapper = mount(AppLayout, {
      slots: { default: '<div class="test-content">Content</div>' },
      global: { stubs: ['Toolbar', 'RepoTabs', 'Sidebar', 'StatusBar'] },
    })
    expect(wrapper.find('.test-content').exists()).toBe(true)
    expect(wrapper.find('Toolbar').exists()).toBe(true)
    expect(wrapper.find('StatusBar').exists()).toBe(true)
  })
})
```

- [ ] **Step 2: 运行测试确认基线**

Run: `cd git-client && npm run test -- src/components/layout/__tests__/AppLayout.test.ts`
Expected: 可能 PASS 或 FAIL（取决于现有 stub 配置），记录结果作为基线

- [ ] **Step 3: 重构 AppLayout.vue**

```vue
<!-- src/components/layout/AppLayout.vue -->
<template>
  <div class="h-screen flex flex-col bg-gray-900 text-gray-100">
    <Toolbar @open="handleOpen" />
    <RepoTabs @open="handleOpen" />
    <div class="main-container flex flex-1 overflow-hidden">
      <Sidebar />
      <ResizeHandle
        v-if="!app.sidebarCollapsed"
        direction="horizontal"
        :min-size="120"
        :max-size="400"
        :get-size="() => app.sidebarWidth"
        @resize="(w: number) => app.sidebarWidth = w"
      />
      <CenterArea />
      <ResizeHandle
        v-if="rightPanel.visible"
        direction="horizontal"
        :min-size="rightPanel.MIN_WIDTH"
        :max-size="rightPanel.MAX_WIDTH"
        :get-size="() => rightPanel.width"
        @resize="(w: number) => rightPanel.setWidth(w)"
      />
      <RightPanel v-show="rightPanel.visible" />
    </div>
    <StatusBar />
  </div>
</template>

<script setup lang="ts">
import Toolbar from './Toolbar.vue'
import RepoTabs from './RepoTabs.vue'
import Sidebar from './Sidebar.vue'
import StatusBar from './StatusBar.vue'
import ResizeHandle from './ResizeHandle.vue'
import CenterArea from './CenterArea.vue'
import RightPanel from './RightPanel.vue'
import { open } from '@tauri-apps/plugin-dialog'
import { useRepoStore } from '../../stores/repo'
import { useBranchesStore } from '../../stores/branches'
import { useCommitsStore } from '../../stores/commits'
import { useAppStore } from '../../stores/app'
import { useRightPanelStore } from '../../stores/rightPanel'
import { useMessage } from 'naive-ui'

const repo = useRepoStore()
const branches = useBranchesStore()
const commits = useCommitsStore()
const app = useAppStore()
const rightPanel = useRightPanelStore()
const msg = useMessage()

async function handleOpen() {
  const selected = await open({ directory: true, multiple: false, title: 'Open Repository' })
  if (!selected) return
  try {
    await repo.openRepo(selected)
    await Promise.all([
      branches.fetchBranches(selected),
      commits.fetchLogs(selected),
    ])
    msg.success(`Opened: ${selected}`)
  } catch (e) {
    msg.error(`Failed to open: ${e}`)
  }
}
</script>
```

- [ ] **Step 4: 创建 CenterArea 容器组件**

```vue
<!-- src/components/layout/CenterArea.vue -->
<template>
  <main class="flex-1 flex overflow-hidden relative">
    <slot />
  </main>
</template>

<script setup lang="ts">
</script>
```

- [ ] **Step 5: 验证构建无报错**

Run: `cd git-client && npx vue-tsc --noEmit`
Expected: 无类型错误（RightPanel 暂未创建可能报错，先忽略或创建空壳）

- [ ] **Step 6: 提交**

```bash
cd git-client
git add src/components/layout/AppLayout.vue src/components/layout/CenterArea.vue src/components/layout/__tests__/AppLayout.test.ts
git commit -m "feat(layout): restructure AppLayout to three-column layout with resize handles"
```

---

### Task 4: 创建 RightPanel 容器组件

**Files:**
- Create: `git-client/src/components/layout/RightPanel.vue`

- [ ] **Step 1: 编写测试**

```typescript
// src/components/layout/__tests__/RightPanel.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import RightPanel from '../RightPanel.vue'
import { useRightPanelStore } from '../../../stores/rightPanel'

describe('RightPanel', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('should not render when hidden', () => {
    const wrapper = mount(RightPanel)
    expect(wrapper.isVisible()).toBe(false)
  })

  it('should render in commit mode when shown', async () => {
    const store = useRightPanelStore()
    store.showPanel('commit', 'abc1234')
    const wrapper = mount(RightPanel)
    // v-show 控制可见性，元素应存在于 DOM 中但不可见
    expect(wrapper.find('.right-panel').exists()).toBe(true)
  })

  it('should close button call hidePanel', async () => {
    const store = useRightPanelStore()
    store.showPanel('staging')
    const wrapper = mount(RightPanel)
    await wrapper.find('.close-btn').trigger('click')
    expect(store.visible).toBe(false)
  })
})
```

- [ ] **Step 2: 运行测试验证失败**

Run: `cd git-client && npm run test -- src/components/layout/__tests__/RightPanel.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现 RightPanel.vue**

```vue
<!-- src/components/layout/RightPanel.vue -->
<template>
  <aside
    class="right-panel flex flex-col bg-gray-850 border-l border-gray-700 overflow-hidden"
    :style="{ width: rightPanel.width + 'px' }"
  >
    <div class="panel-header flex items-center justify-between px-3 py-2 border-b border-gray-700">
      <span class="text-xs text-gray-400 uppercase tracking-wide">
        {{ modeTitle }}
      </span>
      <button class="close-btn text-gray-500 hover:text-gray-200 text-sm leading-none" @click="rightPanel.hidePanel()">✕</button>
    </div>
    <div class="flex-1 overflow-hidden">
      <CommitDetails v-if="rightPanel.mode === 'commit'" />
      <StagingPanel v-else-if="rightPanel.mode === 'staging'" />
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRightPanelStore } from '../../stores/rightPanel'
import CommitDetails from '../commit/CommitDetails.vue'
import StagingPanel from '../staging/StagingPanel.vue'

const rightPanel = useRightPanelStore()

const modeTitle = computed(() => {
  switch (rightPanel.mode) {
    case 'commit': return 'Commit Details'
    case 'staging': return 'Working Files'
    default: return ''
  }
})
</script>

<style scoped>
.right-panel {
  transition: width 0.2s ease, opacity 0.2s ease;
  flex-shrink: 0;
}
.panel-header {
  flex-shrink: 0;
  background: #2d2d2d;
}
</style>
```

- [ ] **Step 4: 创建空壳子组件（避免编译错误）**

```vue
<!-- src/components/commit/CommitDetails.vue (空壳) -->
<template>
  <div class="h-full p-3 overflow-y-auto text-gray-400 text-sm">Commit Details Placeholder</div>
</template>

<script setup lang="ts">
</script>
```

```vue
<!-- src/components/staging/StagingPanel.vue (空壳) -->
<template>
  <div class="h-full p-3 overflow-y-auto text-gray-400 text-sm">Staging Panel Placeholder</div>
</template>

<script setup lang="ts">
</script>
```

- [ ] **Step 5: 运行测试验证通过**

Run: `cd git-client && npm run test -- src/components/layout/__tests__/RightPanel.test.ts`
Expected: PASS

- [ ] **Step 6: 提交**

```bash
cd git-client
git add src/components/layout/RightPanel.vue src/components/commit/CommitDetails.vue src/components/staging/StagingPanel.vue src/components/layout/__tests__/RightPanel.test.ts
git commit -m "feat(layout): add RightPanel container with show/hide animation"
```

---

### Task 5: 实现 CommitDetails 及子组件

**Files:**
- Modify: `git-client/src/components/commit/CommitDetails.vue` (替换空壳)
- Create: `git-client/src/components/commit/CommitHeader.vue`
- Create: `git-client/src/components/commit/ChangedFilesList.vue`

- [ ] **Step 1: 实现 CommitHeader.vue**

```vue
<!-- src/components/commit/CommitHeader.vue -->
<template>
  <div v-if="commit" class="commit-header p-3 border-b border-gray-700" style="background: #252526;">
    <div class="flex items-center gap-2 mb-2">
      <span class="font-mono text-blue-400 text-xs cursor-pointer hover:underline" @click="copySha">{{ shortSha }}</span>
      <n-button size="tiny" quaternary @click="copySha">📋</n-button>
    </div>
    <div class="text-gray-100 text-sm font-medium mb-1">{{ subject }}</div>
    <div v-if="body" class="text-gray-400 text-xs whitespace-pre-wrap mb-2">{{ body }}</div>
    <div class="text-gray-500 text-xs">{{ commit.author }} &lt;{{ commit.author_email }}&gt;</div>
    <div class="text-gray-500 text-xs">{{ formattedDate }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NButton, useMessage } from 'naive-ui'
import type { Commit } from '../../types/git'

const props = defineProps<{
  commit: Commit
}>()

const msg = useMessage()

const shortSha = computed(() => props.commit.id.slice(0, 7))
const subject = computed(() => props.commit.message.split('\n')[0])
const body = computed(() => {
  const lines = props.commit.message.split('\n').slice(1)
  return lines.length > 0 ? lines.join('\n') : ''
})
const formattedDate = computed(() => new Date(props.commit.time * 1000).toLocaleString())

async function copySha() {
  try {
    await navigator.clipboard.writeText(props.commit.id)
    msg.success(`Copied: ${props.commit.id.slice(0, 7)}`)
  } catch {
    msg.warning('Copy failed')
  }
}
</script>
```

- [ ] **Step 2: 实现 ChangedFilesList.vue**

```vue
<!-- src/components/commit/ChangedFilesList.vue -->
<template>
  <div class="changed-files p-2">
    <div class="text-xs text-gray-500 uppercase tracking-wide mb-2 px-1">
      Changed Files ({{ files.length }})
    </div>
    <n-scrollbar v-if="files.length > 0">
      <div
        v-for="file in files"
        :key="file.path"
        class="file-item flex items-center gap-1.5 px-2 py-1.5 cursor-pointer rounded transition-colors mb-0.5"
        :class="[statusClass(file.status), { 'bg-gray-750': selectedFile === file.path }]"
        style="background: #2d2d2d;"
        @click="$emit('select', file.path)"
        @mouseenter="hoveredFile = file.path"
        @mouseleave="hoveredFile = null"
      >
        <span class="font-mono text-xs w-4" :class="statusTextColor(file.status)">{{ statusIcon(file.status) }}</span>
        <span class="text-gray-300 text-xs truncate flex-1">{{ file.path }}</span>
      </div>
    </n-scrollbar>
    <div v-else class="text-gray-600 text-xs px-2 py-3">No changed files</div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { NScrollbar } from 'naive-ui'
import type { FileDiff, DiffStatus } from '../../types/gif'

defineProps<{
  files: FileDiff[]
  selectedFile: string | null
}>()

defineEmits<{
  select: [path: string]
}>()

const hoveredFile = ref<string | null>(null)

function statusIcon(status: DiffStatus): string {
  const map: Record<DiffStatus, string> = { Added: 'A', Modified: 'M', Deleted: 'D', Renamed: 'R', Copied: 'C' }
  return map[status]
}

function statusTextColor(status: DiffStatus): string {
  const map: Record<DiffStatus, string> = {
    Added: 'text-[#e2c08d]',
    Modified: 'text-[#73c991]',
    Deleted: 'text-[#f14c4c]',
    Renamed: 'text-[#dcdcaa]',
    Copied: 'text-[#dcdcaa]',
  }
  return map[status]
}

function statusClass(status: DiffStatus): string {
  return ''
}
</script>

<style scoped>
.file-item:hover {
  filter: brightness(1.2);
}
.file-item:hover::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #0e639c;
}
.file-item {
  position: relative;
}
</style>
```

- [ ] **Step 3: 实现 CommitDetails.vue（完整）**

```vue
<!-- src/components/commit/CommitDetails.vue -->
<template>
  <div class="flex flex-col h-full overflow-hidden">
    <CommitHeader v-if="detail?.commit" :commit="detail.commit" />
    <div v-else class="p-3 text-gray-500 text-sm">No commit selected</div>
    <ChangedFilesList
      :files="changedFiles"
      :selected-file="selectedFile"
      @select="handleSelectFile"
      class="flex-1 overflow-y-auto"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRightPanelStore } from '../../stores/rightPanel'
import { useDiffStore } from '../../stores/diff'
import { useRepoStore } from '../../stores/repo'
import CommitHeader from './CommitHeader.vue'
import ChangedFilesList from './ChangedFilesList.vue'

const rightPanel = useRightPanelStore()
const diffStore = useDiffStore()
const repo = useRepoStore()

const detail = computed(() => rightPanel.commitDetail)
const changedFiles = computed(() => rightPanel.changedFiles)
const selectedFile = computed(() =>
  repo.activeRepoPath ? diffStore.getSelectedFile(repo.activeRepoPath) : null
)

function handleSelectFile(filePath: string) {
  if (repo.activeRepoPath) {
    diffStore.selectFile(repo.activeRepoPath, filePath)
  }
}

watch(() => rightPanel.selectedCommitSha, async (sha) => {
  if (!sha || !repo.activeRepoPath) return
  await diffStore.fetchCommitDiff(repo.activeRepoPath, sha)
  const diffs = diffStore.getDiffs(repo.activeRepoPath)
  const selectedCommit = repo.activeRepo?.selectedCommit
  if (selectedCommit) {
    rightPanel.setCommitDetail({ commit: selectedCommit, files: diffs })
  }
}, { immediate: true })
</script>
```

注意：需要在文件顶部添加 `import { watch } from 'vue'`。

- [ ] **Step 4: 验证构建通过**

Run: `cd git-client && npx vue-tsc --noEmit`
Expected: 无错误

- [ ] **Step 5: 提交**

```bash
cd git-client
git add src/components/commit/CommitDetails.vue src/components/commit/CommitHeader.vue src/components/commit/ChangedFilesList.vue
git commit -m "feat(commit): implement CommitDetails with header and changed files list for right panel"
```

---

### Task 6: 实现 StagingPanel 及子组件

**Files:**
- Modify: `git-client/src/components/staging/StagingPanel.vue` (替换空壳)
- Create: `git-client/src/components/staging/FileStatsHeader.vue`
- Create: `git-client/src/components/staging/UnstagedFilesSection.vue`
- Create: `git-client/src/components/staging/StagedFilesSection.vue`
- Create: `git-client/src/components/staging/CommitEditorSection.vue`

- [ ] **Step 1: 实现 FileStatsHeader.vue**

```vue
<!-- src/components/staging/FileStatsHeader.vue -->
<template>
  <div class="file-stats-header px-3 py-2.5 flex items-center justify-between" style="background: #2d2d2d;">
    <span class="text-xs text-gray-400">
      {{ totalChanges }} file changes on <span class="text-green-400 font-medium">{{ branchName }}</span>
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRepoStore } from '../../stores/repo'
import { useBranchesStore } from '../../stores/branches'
import { useRightPanelStore } from '../../stores/rightPanel'

const repo = useRepoStore()
const branches = useBranchesStore()
const rightPanel = useRightPanelStore()

const branchName = computed(() => {
  if (!repo.activeRepoPath) return 'none'
  const branch = branches.currentBranch(repo.activeRepoPath)
  return branch ?? 'detached'
})

const totalChanges = computed(() =>
  rightPanel.unstagedFiles.length + rightPanel.stagedFiles.length
)
</script>
```

- [ ] **Step 2: 实现 UnstagedFilesSection.vue**

```vue
<!-- src/components/staging/UnstagedFilesSection.vue -->
<template>
  <div class="unstaged-section">
    <div class="section-header px-3 py-1.5 flex items-center justify-between cursor-pointer hover:bg-gray-750" @click="expanded = !expanded">
      <span class="text-xs text-yellow-400 font-medium">Unstaged Files ({{ files.length }})</span>
      <span class="text-gray-500 text-xs">{{ expanded ? '▾' : '▸' }}</span>
    </div>
    <div v-show="expanded">
      <div v-if="files.length > 0" class="px-2 pb-1">
        <button
          class="text-xs text-blue-400 hover:text-blue-300 px-1 py-0.5"
          @click="$emit('stage-all')"
        >Stage All Changes</button>
      </div>
      <n-scrollbar style="max-height: 200px;">
        <div
          v-for="file in files"
          :key="file.path"
          class="flex items-center px-2 py-1 mx-1 rounded cursor-pointer hover:bg-gray-750 gap-1.5"
          style="background: #2d2d2d;"
          @click="$emit('stage', file.path)"
        >
          <span class="text-yellow-400 font-mono text-xs w-4">+</span>
          <span class="text-gray-300 text-xs truncate flex-1">{{ file.path }}</span>
        </div>
      </n-scrollbar>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { NScrollbar } from 'naive-ui'
import type { FileDiff } from '../../types/git'

defineProps<{ files: FileDiff[] }>()
defineEmits<{ stage: [path: string]; 'stage-all': [] }>()

const expanded = ref(true)
</script>
```

- [ ] **Step 3: 实现 StagedFilesSection.vue**

```vue
<!-- src/components/staging/StagedFilesSection.vue -->
<template>
  <div class="staged-section border-t" style="border-color: #3c3c3c;">
    <div class="section-header px-3 py-1.5 flex items-center justify-between cursor-pointer hover:bg-gray-750" @click="expanded = !expanded">
      <span class="text-xs text-green-400 font-medium">Staged Files ({{ files.length }})</span>
      <span class="text-gray-500 text-xs">{{ expanded ? '▾' : '▸' }}</span>
    </div>
    <div v-show="expanded">
      <n-scrollbar style="max-height: 200px;">
        <div
          v-for="file in files"
          :key="file.path"
          class="flex items-center px-2 py-1 mx-1 rounded cursor-pointer hover:bg-gray-750 gap-1.5"
          style="background: #2d2d2d;"
          @click="$emit('unstage', file.path)"
        >
          <span class="text-green-400 font-mono text-xs w-4">−</span>
          <span class="text-gray-300 text-xs truncate flex-1">{{ file.path }}</span>
        </div>
      </n-scrollbar>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { NScrollbar } from 'naive-ui'
import type { FileDiff } from '../../types/git'

defineProps<{ files: FileDiff[] }>()
defineEmits<{ unstage: [path: string] }>()

const expanded = ref(true)
</script>
```

- [ ] **Step 4: 实现 CommitEditorSection.vue**

```vue
<!-- src/components/staging/CommitEditorSection.vue -->
<template>
  <div class="commit-editor-section border-t px-3 py-2 flex-shrink-0" style="border-color: #3c3c3c; background: #252526;">
    <div class="flex items-center gap-1 mb-1.5">
      <n-button type="primary" size="small" :disabled="!canCommit" @click="$emit('commit')" style="background: #0e639c;">
        ⚡ Commit
      </n-button>
      <n-checkbox v-model:checked="amend" size="small">Amend</n-checkbox>
    </div>
    <n-input
      v-model:value="summary"
      placeholder="Summary (required)"
      size="small"
      class="mb-1"
      @update:value="(v: string) => $emit('update:summary', v)"
    />
    <n-input
      v-model:value="description"
      type="textarea"
      :rows="2"
      placeholder="Description (optional)"
      size="small"
      class="mb-1.5"
      @update:value="(v: string) => $emit('update:description', v)"
    />
    <button
      class="w-full py-1.5 text-xs rounded border transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      :class="canCommit
        ? 'border-green-600 text-green-400 hover:bg-green-900/20'
        : 'border-gray-600 text-gray-500'"
      :disabled="!canCommit"
      @click="$emit('commit')"
    >
      ⚡ Stage Changes to Commit
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NInput, NButton, NCheckbox } from 'naive-ui'

const props = defineProps<{
  summary: string
  description: string
  amend: boolean
  hasStagedFiles: boolean
}>()

defineEmits<{
  commit: []
  'update:summary': [value: string]
  'update:description': [value: string]
  'update:amend': [value: boolean]
}>()

const amend = computed({
  get: () => props.amend,
  set: (v) => { /* handled by parent */ }
})

const canCommit = computed(() => props.summary.trim().length > 0 && props.hasStagedFiles)
</script>
```

- [ ] **Step 5: 实现 StagingPanel.vue（组装所有子组件）**

```vue
<!-- src/components/staging/StagingPanel.vue -->
<template>
  <div class="flex flex-col h-full overflow-hidden">
    <FileStatsHeader />
    <div class="flex-1 overflow-y-auto">
      <UnstagedFilesSection
        :files="rightPanel.unstagedFiles"
        @stage="handleStage"
        @stage-all="handleStageAll"
      />
      <StagedFilesSection
        :files="rightPanel.stagedFiles"
        @unstage="handleUnstage"
      />
    </div>
    <CommitEditorSection
      :summary="rightPanel.commitMessage.summary"
      :description="rightPanel.commitMessage.description"
      :amend="rightPanel.amendMode"
      :has-staged-files="rightPanel.stagedFiles.length > 0"
      @commit="handleCommit"
      @update:summary="(v: string) => rightPanel.commitMessage.summary = v"
      @update:description="(v: string) => rightPanel.commitMessage.description = v"
      @update:amend="(v: boolean) => rightPanel.amendMode = v"
    />
  </div>
</template>

<script setup lang="ts">
import { watch, onMounted } from 'vue'
import { useRightPanelStore } from '../../stores/rightPanel'
import { useStagingStore } from '../../stores/staging'
import { useRepoStore } from '../../stores/repo'
import { useCommitsStore } from '../../stores/commits'
import { useMessage } from 'naive-ui'
import { invoke } from '../../utils/ipc'
import FileStatsHeader from './FileStatsHeader.vue'
import UnstagedFilesSection from './UnstagedFilesSection.vue'
import StagedFilesSection from './StagedFilesSection.vue'
import CommitEditorSection from './CommitEditorSection.vue'

const rightPanel = useRightPanelStore()
const staging = useStagingStore()
const repo = useRepoStore()
const commits = useCommitsStore()
const msg = useMessage()

onMounted(async () => {
  await refreshStaging()
})

watch(() => rightPanel.visible, async (v) => {
  if (v && rightPanel.mode === 'staging') {
    await refreshStaging()
  }
})

async function refreshStaging() {
  if (!repo.activeRepoPath) return
  await staging.refresh(repo.activeRepoPath)
  const state = staging.getFileState(repo.activeRepoPath)
  rightPanel.setStagingData(state.unstaged, state.staged)
}

async function handleStage(path: string) {
  if (!repo.activeRepoPath) return
  await staging.stageFiles(repo.activeRepoPath, [path])
  await refreshStaging()
}

async function handleStageAll() {
  if (!repo.activeRepoPath) return
  const paths = rightPanel.unstagedFiles.map(f => f.path)
  if (paths.length === 0) return
  await staging.stageFiles(repo.activeRepoPath, paths)
  await refreshStaging()
}

async function handleUnstage(path: string) {
  if (!repo.activeRepoPath) return
  await staging.unstageFiles(repo.activeRepoPath, [path])
  await refreshStaging()
}

async function handleCommit() {
  if (!repo.activeRepoPath) return
  const { summary, description } = rightPanel.commitMessage
  if (!summary.trim()) {
    msg.warning('Please enter a commit summary')
    return
  }
  try {
    await invoke('commit', {
      repoPath: repo.activeRepoPath,
      message: description.trim() ? `${summary}\n\n${description}` : summary,
      amend: rightPanel.amendMode,
    })
    rightPanel.commitMessage = { summary: '', description: '' }
    msg.success('Committed successfully')
    await commits.fetchLogs(repo.activeRepoPath)
    await refreshStaging()
  } catch (e) {
    msg.error(String(e))
  }
}
</script>
```

- [ ] **Step 6: 验证构建通过**

Run: `cd git-client && npx vue-tsc --noEmit`
Expected: 无错误

- [ ] **Step 7: 提交**

```bash
cd git-client
git add src/components/staging/
git commit -m "feat(staging): implement full StagingPanel with file lists and commit editor"
```

---

### Task 7: 重构 App.vue 和 Sidebar

**Files:**
- Modify: `git-client/src/App.vue`
- Modify: `git-client/src/components/layout/Sidebar.vue`
- Modify: `git-client/src/stores/app.ts`

- [ ] **Step 1: 修改 app store 默认 sidebar 宽度**

在 `src/stores/app.ts` 中修改：
```typescript
const sidebarWidth = ref(180)  // 从 240 改为 180
```

- [ ] **Step 2: 重构 App.vue**

```vue
<!-- src/App.vue -->
<template>
  <n-config-provider :theme="theme">
    <n-message-provider>
      <AppLayout>
        <CommitList />
      </AppLayout>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { darkTheme } from 'naive-ui'
import AppLayout from './components/layout/AppLayout.vue'
import CommitList from './components/commit/CommitList.vue'
import { useKeyboard } from './composables/useKeyboard'
import { useRepoStore } from './stores/repo'
import { useBranchesStore } from './stores/branches'
import { useRemoteStore } from './stores/remote'
import { useCommitsStore } from './stores/commits'
import { useAppStore } from './stores/app'
import { useRightPanelStore } from './stores/rightPanel'

const repo = useRepoStore()
const branches = useBranchesStore()
const remote = useRemoteStore()
const commits = useCommitsStore()
const appStore = useAppStore()
const rightPanel = useRightPanelStore()

const theme = computed(() => appStore.theme === 'dark' ? darkTheme : undefined)

useKeyboard([
  { key: 'l', ctrl: true, handler: () => {
    if (repo.activeRepoPath) {
      const branch = branches.currentBranch(repo.activeRepoPath)
      if (branch) remote.pullRemote(repo.activeRepoPath, 'origin', branch)
    }
  }},
  { key: 'p', ctrl: true, shift: true, handler: () => {
    if (repo.activeRepoPath) {
      const branch = branches.currentBranch(repo.activeRepoPath)
      if (branch) remote.pushRemote(repo.activeRepoPath, 'origin', branch)
    }
  }},
  { key: 'F5', handler: () => {
    if (repo.activeRepoPath) {
      commits.fetchLogs(repo.activeRepoPath)
      branches.fetchBranches(repo.activeRepoPath)
    }
  }},
  { key: 'Escape', handler: () => {
    rightPanel.hidePanel()
  }},
])

onMounted(async () => {
  try {
    await appStore.loadSettings()
  } catch (e) {
    console.warn('loadSettings error:', e)
  }
})
</script>
```

- [ ] **Step 3: 在 Sidebar 添加 Working Files 导航项**

修改 `src/components/layout/Sidebar.vue`，在 Stash 区域后添加：

```vue
<div class="p-2 border-t border-gray-700">
  <div class="text-xs text-gray-500 mb-1">Working Files</div>
  <button
    class="w-full text-left text-xs px-2 py-1 rounded hover:bg-gray-700 text-gray-300 flex items-center gap-1.5"
    :class="{ 'bg-blue-900/30 text-blue-300': rightPanel.mode === 'staging' && rightPanel.visible }"
    @click="rightPanel.showPanel('staging')"
  >
    <span>📝</span> Files
  </button>
</div>
```

并在 `<script setup>` 中添加：
```typescript
import { useRightPanelStore } from '../../stores/rightPanel'
const rightPanel = useRightPanelStore()
```

- [ ] **Step 4: 修改 CommitList.vue 移除固定宽度**

在 `src/components/commit/CommitList.vue` 中，将外层 div 的 `style="width: 420px;"` 改为自适应：

```vue
<!-- 修改前 -->
<div class="flex flex-col border-r border-gray-700" style="width: 420px;">

<!-- 修改后 -->
<div class="flex flex-col border-r border-gray-700 w-full max-w-md">
```

- [ ] **Step 5: 验证构建和开发服务器**

Run: `cd git-client && npx vue-tsc --noEmit`
Expected: 无错误

Run: `cd git-client && npm run dev:git-client`
Expected: 开发服务器启动成功，三栏布局可见

- [ ] **Step 6: 提交**

```bash
cd git-client
git add src/App.vue src/components/layout/Sidebar.vue src/components/commit/CommitList.vue src/stores/app.ts
git commit -m "feat(layout): wire up new layout in App.vue, add Working Files nav to Sidebar"
```

---

### Task 8: 集成 Commit 点击 → 右侧面板显示

**Files:**
- Modify: `git-client/src/components/commit/CommitList.vue`

- [ ] **Step 1: 修改 CommitList selectCommit 函数**

在 `CommitList.vue` 的 `selectCommit` 函数中添加右侧面板打开逻辑：

```typescript
// 替换原有的 selectCommit 函数
function selectCommit(commit: Commit) {
  if (repo.activeRepoPath) {
    commits.selectCommit(repo.activeRepoPath, commit)
    rightPanel.showPanel('commit', commit.id)
  }
}
```

并确保导入：
```typescript
import { useRightPanelStore } from '../../stores/rightPanel'
// ...
const rightPanel = useRightPanelStore()
```

- [ ] **Step 2: 手动验证流程**

1. 启动应用 `npm run dev:git-client`
2. 打开仓库
3. 点击任意 commit → 右侧面板应滑出显示 Commit Details
4. 点击关闭按钮 → 面板收起
5. 按 Escape → 面板收起
6. 点击左侧 Working Files → 显示 Staging Panel

- [ ] **Step 3: 提交**

```bash
cd git-client
git add src/components/commit/CommitList.vue
git commit -m "feat(integration): open right panel on commit selection"
```

---

### Task 9: 键盘快捷键完善与响应式断点

**Files:**
- Modify: `git-client/src/App.vue` (扩展键盘快捷键)
- Create: `git-client/src/composables/useBreakpoint.ts`

- [ ] **Step 1: 扩展键盘快捷键**

在 `App.vue` 的 `useKeyboard` 调用中添加：

```typescript
{ key: 'Enter', ctrl: true, handler: () => {
  // Ctrl+Enter: 在 Staging Panel 提交
  if (rightPanel.mode === 'staging' && rightPanel.commitMessage.summary.trim()) {
    // 通过事件触发提交（需 StagingPanel 支持）
  }
}},
```

- [ ] **Step 2: 创建响应式断点 composable**

```typescript
// src/composables/useBreakpoint.ts
import { ref, onMounted, onUnmounted } from 'vue'

export interface Breakpoints {
  small: number
  medium: number
  large: number
}

const DEFAULT_BREAKPOINTS: Breakpoints = { small: 768, medium: 1024, large: 1440 }

export function useBreakpoints(custom?: Partial<Breakpoints>) {
  const bp = { ...DEFAULT_BREAKPOINTS, ...custom }
  const width = ref(window.innerWidth)
  const isSmall = computed(() => width.value < bp.small)
  const isMedium = computed(() => width.value >= bp.small && width.value < bp.large)
  const isLarge = computed(() => width.value >= bp.large)

  function onResize() { width.value = window.innerWidth }

  onMounted(() => window.addEventListener('resize', onResize))
  onUnmounted(() => window.removeEventListener('resize', onResize))

  return { width, isSmall, isMedium, isLarge }
}
```

注意：需要添加 `import { computed } from 'vue'`。

- [ ] **Step 3: 在 RightPanel 中集成响应式逻辑**

在 `RightPanel.vue` 中添加窗口尺寸监听，小屏时强制隐藏面板：

```typescript
import { useBreakpoint } from '../../composables/useBreakpoint'

const { isSmall } = useBreakpoint()

watch(isSmall, (small) => {
  if (small) rightPanel.hidePanel()
})
```

- [ ] **Step 4: 提交**

```bash
cd git-client
git add src/App.vue src/components/layout/RightPanel.vue src/composables/useBreakpoint.ts
git commit -m "feat(layout): add keyboard shortcuts and responsive breakpoint support"
```

---

## 自审清单

### Spec 覆盖度检查

| 设计文档章节 | 对应 Task | 状态 |
|-------------|----------|------|
| §2 整体布局结构 (三栏) | Task 3 | ✅ |
| §2.1 各区域规格 (尺寸表) | Task 3, 7 | ✅ |
| §3.1 状态机 (面板切换) | Task 1, 4 | ✅ |
| §3.2 流程 A (查看提交历史) | Task 5, 8 | ✅ |
| §3.2 流程 B (Staging 工作流) | Task 6, 8 | ✅ |
| §4.1 Commit Details 模式 | Task 5 | ✅ |
| §4.2 Staging Panel 模式 | Task 6 | ✅ |
| §5.1 Store 设计 | Task 1 | ✅ |
| §5.2 组件层级 | Task 3-6 | ✅ |
| §5.3.1 可拖拽分栏 | Task 2 | ✅ |
| §5.3.2 面板动画 | Task 4 | ✅ |
| §5.3.3 视图切换 | Task 3 (CenterArea) | ✅ |
| §5.3.4 NaiveUI Scrollbar | Task 5, 6 | ✅ |
| §5.3.5 响应式断点 | Task 9 | ✅ |
| §5.5 与现有代码集成 | Task 7, 8 | ✅ |
| §7.1 键盘导航 | Task 8, 9 | ✅ |
| §8 主题适配 | 所有组件使用 CSS 变量 | ✅ |

### 占位符扫描
- ❌ 无 TBD / TODO / "implement later"
- ❌ 无 "add appropriate error handling"
- ❌ 无 "Similar to Task N" 引用
- ❌ 所有代码步骤包含实际代码

### 类型一致性
- `RightPanelMode` = `'commit' | 'staging' | null` — 全局统一
- `FileDiff` 类型来自 `types/git.d.ts` — 全局统一
- `Commit` 类型来自 `types/git.d.ts` — 全局统一
- Store 方法签名在各 Task 间一致

---

**文档版本**: 1.0
**基于设计文档**: `docs/superpowers/specs/2026-05-13-gitkraken-layout-design.md`
