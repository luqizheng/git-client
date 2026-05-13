# NSplit 三栏布局 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用 Naive UI NSplit 替换自定义 ResizeHandle，实现三栏可拖拽布局

**Architecture:** 双层嵌套 NSplit - 外层分割 Sidebar 与内容区，内层分割 CenterArea(CommitList) 与 RightPanel

**Tech Stack:** Naive UI NSplit, Vue 3, TypeScript

---

### Task 1: 注册 NSplit 组件

**Files:**
- Modify: `git-client/src/plugins/naive.ts`

- [ ] **Step 1: 添加 NSplit 到按需注册列表**

```typescript
import {
  create,
  NConfigProvider,
  NMessageProvider,
  NDialogProvider,
  NNotificationProvider,
  NLoadingBarProvider,
  NSplit,           // 新增
} from 'naive-ui'

const naive = create({
  components: [
    NConfigProvider,
    NMessageProvider,
    NDialogProvider,
    NNotificationProvider,
    NLoadingBarProvider,
    NSplit,          // 新增
  ],
})
```

---

### Task 2: 重构 AppLayout.vue 布局

**Files:**
- Modify: `git-client/src/components/layout/AppLayout.vue`

- [ ] **Step 1: 用双层 NSplit 替换 ResizeHandle**

```vue
<template>
  <div class="h-screen flex flex-col bg-gray-900 text-gray-100">
    <Toolbar @open="handleOpen" />
    <RepoTabs @open="handleOpen" />
    <div class="main-container flex flex-1 overflow-hidden">
      <!-- 外层 Split: Sidebar | Content+RightPanel -->
      <n-split
        direction="horizontal"
        :default-size="sidebarDefaultSize"
        :min="0.1"
        :max="0.4"
        :pane1-style="{ 'min-width': '120px', 'overflow': 'hidden' }"
        :pane2-style="{ 'overflow': 'hidden' }"
        v-if="!app.sidebarCollapsed"
      >
        <template #1>
          <Sidebar />
        </template>
        <template #2>
          <!-- 内层 Split: CenterArea | RightPanel -->
          <n-split
            direction="horizontal"
            :default-size="innerDefaultSize"
            :min="0.3"
            :max="0.8"
            :pane1-style="{ 'overflow': 'hidden' }"
            :pane2-style="{ 'overflow': 'hidden', 'min-width': rightPanel.MIN_WIDTH + 'px' }"
            v-show="rightPanel.visible || true"
          >
            <template #1>
              <CenterArea>
                <slot />
              </CenterArea>
            </template>
            <template #2>
              <RightPanel v-show="rightPanel.visible" />
            </template>
          </n-split>
        </template>
      </n-split>

      <!-- Sidebar 折叠时只显示内容区 -->
      <template v-if="app.sidebarCollapsed">
        <CenterArea class="flex-1">
          <slot />
        </CenterArea>
        <RightPanel v-show="rightPanel.visible" />
      </template>
    </div>
    <StatusBar />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Toolbar from './Toolbar.vue'
import RepoTabs from './RepoTabs.vue'
import Sidebar from './Sidebar.vue'
import StatusBar from './StatusBar.vue'
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

// 将现有 sidebarWidth (px) 转为比例，默认约 20%
const sidebarDefaultSize = computed(() => {
  const w = app.sidebarWidth || 200
  return Math.min(Math.max(w / 1200, 0.15), 0.35)
})

// 内层默认 CommitList 占 60%
const innerDefaultSize = computed(() => {
  if (!rightPanel.visible) return 1
  return 0.6
})

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

---

### Task 3: 修改 CommitList.vue 宽度

**Files:**
- Modify: `git-client/src/components/commit/CommitList.vue`

- [ ] **Step 1: 移除 max-w-md 限制，改为 100% 宽度**

将第 2 行:
```html
<div class="flex flex-col border-r border-gray-700 w-full max-w-md">
```
改为:
```html
<div class="flex flex-col border-r border-gray-700 w-full h-full">
```

---

### Task 4: 验证构建

- [ ] **Step 1: 运行开发服务器验证**

```bash
cd git-client && npm run dev
```
