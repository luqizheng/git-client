# shadcn-vue 迁移实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Git 客户端从 Naive UI 完全迁移至 shadcn-vue + Tailwind CSS

**架构：** 渐进式替换，分阶段进行。每阶段完成后验证功能，确保应用始终可运行。

**技术栈：** Vue 3 + TypeScript + Tailwind CSS + shadcn-vue + radix-vue

---

## 文件结构变更

### 新增文件
- `git-client/tailwind.config.js` - Tailwind 配置
- `git-client/postcss.config.js` - PostCSS 配置
- `git-client/components.json` - shadcn-vue 配置
- `git-client/src/lib/utils.ts` - cn() 工具函数
- `git-client/src/components/ui/*` - shadcn 组件目录

### 修改文件
- `git-client/package.json` - 依赖变更
- `git-client/src/main.ts` - 移除 naive-ui
- `git-client/vite.config.ts` - 路径别名配置
- `git-client/src/assets/styles/variables.css` - 主题变量
- `git-client/src/assets/styles/main.css` - 导入 Tailwind
- 所有 Vue 组件文件

### 删除文件
- `git-client/src/plugins/naive.ts`

---

## Task 1: 安装 Tailwind CSS

**Files:**
- Create: `git-client/tailwind.config.js`
- Create: `git-client/postcss.config.js`
- Modify: `git-client/package.json`
- Modify: `git-client/src/assets/styles/main.css`

- [ ] **Step 1: 安装依赖**

```bash
cd git-client
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

- [ ] **Step 2: 配置 tailwind.config.js**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

- [ ] **Step 3: 创建 CSS 入口文件**

修改 `src/assets/styles/main.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* 保留原有变量 */
@import './variables.css';
```

- [ ] **Step 4: 在 main.ts 导入 CSS**

```typescript
import { createApp } from 'vue'
import App from './App.vue'
import './assets/styles/main.css'

const app = createApp(App)
app.mount('#app')
```

- [ ] **Step 5: 验证安装**

在任意 Vue 文件添加测试类名 `bg-red-500`，确认 Tailwind 生效。

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "chore: install and configure Tailwind CSS"
```

---

## Task 2: 初始化 shadcn-vue

**Files:**
- Create: `git-client/components.json`
- Create: `git-client/src/lib/utils.ts`
- Modify: `git-client/package.json`
- Modify: `git-client/vite.config.ts`

- [ ] **Step 1: 安装 shadcn-vue 依赖**

```bash
cd git-client
npm install class-variance-authority clsx tailwind-merge @radix-ui/react-icons lucide-vue-next
```

- [ ] **Step 2: 创建 utils.ts**

创建 `src/lib/utils.ts`:

```typescript
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 3: 创建 components.json**

```json
{
  "$schema": "https://shadcn-vue.com/schema.json",
  "style": "default",
  "typescript": true,
  "tsConfigPath": "./tsconfig.json",
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "src/assets/styles/main.css",
    "baseColor": "zinc",
    "cssVariables": true
  },
  "framework": "vite",
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui"
  }
}
```

- [ ] **Step 4: 配置 Vite 路径别名**

修改 `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})
```

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "chore: initialize shadcn-vue configuration"
```

---

## Task 3: 安装基础 shadcn 组件

**Files:**
- Create: `git-client/src/components/ui/button/*`
- Create: `git-client/src/components/ui/input/*`
- Create: `git-client/src/components/ui/label/*`

- [ ] **Step 1: 安装 Button 组件**

```bash
cd git-client
npx shadcn-vue@latest add button
```

- [ ] **Step 2: 安装 Input 组件**

```bash
npx shadcn-vue@latest add input
```

- [ ] **Step 3: 安装 Label 组件**

```bash
npx shadcn-vue@latest add label
```

- [ ] **Step 4: 验证组件可用**

在测试页面使用 Button 组件，确认渲染正常。

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: add shadcn button, input, label components"
```

---

## Task 4: 替换 CloneDialog 组件

**Files:**
- Modify: `git-client/src/components/repo/CloneDialog.vue`
- Create: `git-client/src/components/ui/dialog/*`

- [ ] **Step 1: 安装 Dialog 组件**

```bash
cd git-client
npx shadcn-vue@latest add dialog
```

- [ ] **Step 2: 重写 CloneDialog.vue**

```vue
<template>
  <Dialog :open="show" @update:open="show = $event">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Clone Repository</DialogTitle>
      </DialogHeader>
      <div class="space-y-4 py-4">
        <div class="space-y-2">
          <Label for="url">URL</Label>
          <Input
            id="url"
            v-model="url"
            placeholder="https://github.com/user/repo.git"
          />
        </div>
        <div class="space-y-2">
          <Label for="path">Local Path</Label>
          <Input
            id="path"
            v-model="path"
            placeholder="/path/to/clone"
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" @click="show = false">Cancel</Button>
        <Button :disabled="loading" @click="doClone">
          <Loader2 v-if="loading" class="mr-2 h-4 w-4 animate-spin" />
          Clone
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Loader2 } from 'lucide-vue-next'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRepoStore } from '../../stores/repo'

const show = defineModel<boolean>('show', { default: false })
const url = ref('')
const path = ref('')
const loading = ref(false)
const repo = useRepoStore()

async function doClone() {
  if (!url.value || !path.value) return
  loading.value = true
  try {
    await repo.cloneRepo(url.value, path.value)
    show.value = false
    url.value = ''
    path.value = ''
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}
</script>
```

- [ ] **Step 3: 验证对话框功能**

测试打开、关闭、输入、克隆流程。

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "refactor: migrate CloneDialog from naive-ui to shadcn-vue"
```

---

## Task 5: 安装并替换 Select 和 Checkbox

**Files:**
- Create: `git-client/src/components/ui/select/*`
- Create: `git-client/src/components/ui/checkbox/*`
- Modify: `git-client/src/components/commit/CommitEditor.vue`

- [ ] **Step 1: 安装 Select 组件**

```bash
cd git-client
npx shadcn-vue@latest add select
```

- [ ] **Step 2: 安装 Checkbox 组件**

```bash
npx shadcn-vue@latest add checkbox
```

- [ ] **Step 3: 重写 CommitEditor.vue**

```vue
<template>
  <div class="p-2 border-t border-border">
    <div class="flex gap-1 mb-1">
      <Select v-model="template" @update:model-value="applyTemplate">
        <SelectTrigger class="w-32">
          <SelectValue placeholder="Template" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="feat: ">feat:</SelectItem>
          <SelectItem value="fix: ">fix:</SelectItem>
          <SelectItem value="docs: ">docs:</SelectItem>
          <SelectItem value="refactor: ">refactor:</SelectItem>
          <SelectItem value="chore: ">chore:</SelectItem>
        </SelectContent>
      </Select>
    </div>
    <Textarea
      v-model="message"
      :rows="4"
      placeholder="Commit message..."
      class="text-sm"
    />
    <div class="flex items-center gap-2 mt-2">
      <div class="flex items-center space-x-2">
        <Checkbox id="amend" v-model:checked="amend" />
        <Label for="amend" class="text-sm">Amend</Label>
      </div>
      <div class="flex-1" />
      <Button size="sm" :disabled="!message.trim()" @click="doCommit">
        Commit
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { invoke } from '../../utils/ipc'
import { useRepoStore } from '../../stores/repo'
import { useCommitsStore } from '../../stores/commits'
import type { Commit } from '../../types/git'

const repo = useRepoStore()
const commits = useCommitsStore()
const message = ref('')
const amend = ref(false)
const template = ref<string>('')

function applyTemplate(val: string) {
  if (!message.value.startsWith(val)) {
    message.value = val + message.value.replace(/^(feat|fix|docs|refactor|chore):\s*/, '')
  }
}

async function doCommit() {
  if (!repo.activeRepoPath || !message.value.trim()) return
  try {
    await invoke<Commit>('commit', {
      repoPath: repo.activeRepoPath,
      message: message.value,
      amend: amend.value,
    })
    message.value = ''
    amend.value = false
    await commits.fetchLogs(repo.activeRepoPath)
  } catch (e) {
    console.error(e)
  }
}
</script>
```

- [ ] **Step 4: 安装 Textarea 组件**

```bash
npx shadcn-vue@latest add textarea
```

- [ ] **Step 5: 验证提交编辑器功能**

测试模板选择、消息输入、提交按钮。

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "refactor: migrate CommitEditor from naive-ui to shadcn-vue"
```

---

## Task 6: 安装 Badge 和 DropdownMenu

**Files:**
- Create: `git-client/src/components/ui/badge/*`
- Create: `git-client/src/components/ui/dropdown-menu/*`

- [ ] **Step 1: 安装 Badge 组件**

```bash
cd git-client
npx shadcn-vue@latest add badge
```

- [ ] **Step 2: 安装 DropdownMenu 组件**

```bash
npx shadcn-vue@latest add dropdown-menu
```

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: add shadcn badge and dropdown-menu components"
```

---

## Task 7: 替换 AppLayout 中的 NSplit

**Files:**
- Create: `git-client/src/components/ui/resizable/*`
- Modify: `git-client/src/components/layout/AppLayout.vue`

- [ ] **Step 1: 安装 Resizable 组件**

```bash
cd git-client
npx shadcn-vue@latest add resizable
```

- [ ] **Step 2: 重写 AppLayout.vue**

```vue
<template>
  <div class="h-screen flex flex-col bg-background text-foreground">
    <Toolbar @open="handleOpen" @fetch="handleFetch" @pull="handlePull" @push="handlePush" @clone="handleClone" />
    <ResizablePanelGroup direction="horizontal" class="flex-1">
      <ResizablePanel :default-size="15" :min-size="8" :max-size="35">
        <Sidebar />
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel :default-size="55" :min-size="20">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel :default-size="60">
            <CenterArea class="h-full">
              <slot />
            </CenterArea>
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel :default-size="40">
            <RightPanel />
          </ResizablePanel>
        </ResizablePanelGroup>
      </ResizablePanel>
    </ResizablePanelGroup>
    <StatusBar />
    <CloneDialog v-model:show="showCloneDialog" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Toolbar from './Toolbar.vue'
import Sidebar from './Sidebar.vue'
import StatusBar from './StatusBar.vue'
import CenterArea from './CenterArea.vue'
import RightPanel from './RightPanel.vue'
import CloneDialog from '../repo/CloneDialog.vue'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable'
import { open } from '@tauri-apps/plugin-dialog'
import { useRepoStore } from '../../stores/repo'
import { useBranchesStore } from '../../stores/branches'
import { useCommitsStore } from '../../stores/commits'
import { useRemoteStore } from '../../stores/remote'

const repo = useRepoStore()
const branches = useBranchesStore()
const commits = useCommitsStore()
const remote = useRemoteStore()

const showCloneDialog = ref(false)

async function handleOpen() {
  const selected = await open({ directory: true, multiple: false, title: 'Open Repository' })
  if (!selected) return
  try {
    await repo.openRepo(selected)
    await Promise.all([
      branches.fetchBranches(selected),
      commits.fetchLogs(selected),
    ])
  } catch (e) {
    console.error(e)
  }
}

function handleClone() {
  showCloneDialog.value = true
}

async function handleFetch() {
  if (!repo.activeRepoPath) return
  const remotes = remote.getRemotes(repo.activeRepoPath)
  if (remotes.length === 0) return
  try {
    await remote.fetchRemote(repo.activeRepoPath, remotes[0].name)
    await commits.fetchLogs(repo.activeRepoPath)
  } catch (e) {
    console.error(e)
  }
}

async function handlePull() {
  if (!repo.activeRepoPath) return
  const remotes = remote.getRemotes(repo.activeRepoPath)
  if (remotes.length === 0) return
  const currentBranchName = branches.currentBranch(repo.activeRepoPath)
  if (!currentBranchName) return
  try {
    await remote.pullRemote(repo.activeRepoPath, remotes[0].name, currentBranchName)
    await commits.fetchLogs(repo.activeRepoPath)
  } catch (e) {
    console.error(e)
  }
}

async function handlePush() {
  if (!repo.activeRepoPath) return
  const remotes = remote.getRemotes(repo.activeRepoPath)
  if (remotes.length === 0) return
  const currentBranchName = branches.currentBranch(repo.activeRepoPath)
  if (!currentBranchName) return
  try {
    await remote.pushRemote(repo.activeRepoPath, remotes[0].name, currentBranchName)
  } catch (e) {
    console.error(e)
  }
}
</script>
```

- [ ] **Step 3: 验证布局功能**

测试面板拖拽、大小调整、布局保持。

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "refactor: migrate AppLayout NSplit to shadcn Resizable"
```

---

## Task 8: 安装 Sonner 并替换 useMessage

**Files:**
- Create: `git-client/src/components/ui/sonner/*`
- Modify: `git-client/src/main.ts`
- Modify: 所有使用 useMessage 的文件

- [ ] **Step 1: 安装 Sonner 组件**

```bash
cd git-client
npx shadcn-vue@latest add sonner
```

- [ ] **Step 2: 在 main.ts 添加 Toaster**

```typescript
import { createApp } from 'vue'
import App from './App.vue'
import './assets/styles/main.css'
import { Toaster } from '@/components/ui/sonner'

const app = createApp(App)
app.component('Toaster', Toaster)
app.mount('#app')
```

- [ ] **Step 3: 创建 toast 工具函数**

创建 `src/utils/toast.ts`:

```typescript
import { toast as sonnerToast } from 'vue-sonner'

export const toast = {
  success: (message: string) => sonnerToast.success(message),
  error: (message: string) => sonnerToast.error(message),
  warning: (message: string) => sonnerToast.warning(message),
  info: (message: string) => sonnerToast.info(message),
}
```

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: add sonner toast component and toast utility"
```

---

## Task 9: 批量替换剩余组件

**Files:**
- Modify: 所有剩余使用 Naive UI 的 Vue 文件

- [ ] **Step 1: 列出所有含 naive-ui 导入的文件**

```bash
grep -r "from 'naive-ui'" git-client/src --include="*.vue" --include="*.ts" -l
```

- [ ] **Step 2: 逐个文件替换**

对每个文件：
1. 移除 `import { ... } from 'naive-ui'`
2. 替换为对应的 shadcn 组件导入
3. 更新模板中的组件标签
4. 验证功能

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "refactor: batch replace remaining naive-ui components"
```

---

## Task 10: 移除 Naive UI 依赖

**Files:**
- Modify: `git-client/package.json`
- Delete: `git-client/src/plugins/naive.ts`
- Modify: `git-client/src/main.ts`

- [ ] **Step 1: 从 package.json 移除 naive-ui**

```bash
cd git-client
npm uninstall naive-ui
```

- [ ] **Step 2: 删除 naive.ts 插件文件**

```bash
rm git-client/src/plugins/naive.ts
```

- [ ] **Step 3: 从 main.ts 移除 naive 导入**

确保 main.ts 不再导入或使用 naive 插件。

- [ ] **Step 4: 验证构建**

```bash
cd git-client
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "chore: remove naive-ui dependency"
```

---

## Task 11: 整合 tweakcn.com 主题

**Files:**
- Modify: `git-client/src/assets/styles/variables.css`
- Modify: `git-client/tailwind.config.js`

- [ ] **Step 1: 从 tweakcn.com 生成主题**

访问 https://tweakcn.com/，配置主题后复制生成的 CSS 变量。

- [ ] **Step 2: 更新 variables.css**

将 tweakcn 生成的 CSS 变量整合到 `variables.css`，保留必要的自定义变量。

- [ ] **Step 3: 更新 tailwind.config.js**

添加颜色配置，映射到 CSS 变量。

- [ ] **Step 4: 验证主题应用**

检查所有组件样式正确。

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: integrate tweakcn.com theme"
```

---

## Task 12: 最终验证

- [ ] **Step 1: 类型检查**

```bash
cd git-client
npx vue-tsc --noEmit
```

- [ ] **Step 2: 构建测试**

```bash
npm run build
```

- [ ] **Step 3: 运行单元测试**

```bash
npm run test
```

- [ ] **Step 4: 手动功能测试**

- 打开仓库
- 克隆仓库
- 提交更改
- 分支操作
- 远程操作

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "chore: finalize shadcn-vue migration"
```

---

## 依赖清单

### 安装
- `tailwindcss`
- `postcss`
- `autoprefixer`
- `class-variance-authority`
- `clsx`
- `tailwind-merge`
- `lucide-vue-next`

### 移除
- `naive-ui`

---

## 风险与缓解

| 风险 | 缓解措施 |
|-----|---------|
| NSplit 行为差异 | 测试 Resizable 面板拖拽和尺寸保持 |
| useMessage 调用方式变更 | 统一使用 toast 工具函数 |
| 主题不兼容 | 逐步替换 CSS 变量，保留自定义变量 |
| 构建失败 | 每阶段后执行构建验证 |
