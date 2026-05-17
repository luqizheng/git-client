# Commit 文件 Diff 集成实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在选中 commit 文件时，在主区域显示双列 diff 视图

**Architecture:** 改造 AppContent.vue 根据 selectedFile 状态切换视图；创建 CommitFileDiffView.vue 在主区域显示 diff；改造 DiffView.vue 支持 Split/Unified 切换

**Tech Stack:** Vue 3, Naive UI, Pinia

---

## File Structure

```
git-client/src/
├── components/
│   ├── layout/
│   │   └── AppContent.vue          # 修改: 添加视图切换逻辑
│   └── commit/
│       └── CommitFileDiffView.vue   # 新建: 主区域 diff 视图
└── components/diff/
    └── DiffView.vue                # 修改: 支持双列显示
```

---

## Tasks

### Task 1: 创建 CommitFileDiffView.vue

**Files:**
- Create: `git-client/src/components/commit/CommitFileDiffView.vue`
- Modify: `git-client/src/components/diff/DiffView.vue`

- [ ] **Step 1: 创建 CommitFileDiffView.vue 基础结构**

```vue
<template>
  <div class="commit-file-diff-view">
    <div class="diff-header">
      <span class="file-path">{{ filePath }}</span>
      <div class="view-controls">
        <n-button-group>
          <n-button size="tiny" :type="mode === 'split' ? 'primary' : 'default'" @click="mode = 'split'">Split</n-button>
          <n-button size="tiny" :type="mode === 'unified' ? 'primary' : 'default'" @click="mode = 'unified'">Unified</n-button>
        </n-button-group>
        <n-button-group>
          <n-button size="tiny" quaternary @click="goPrev">Prev</n-button>
          <n-button size="tiny" quaternary @click="goNext">Next</n-button>
        </n-button-group>
      </div>
    </div>
    <div class="diff-content">
      <DiffView
        v-if="currentFile"
        :file="currentFile"
        :mode="mode"
        ref="diffViewRef"
      />
      <div v-else class="empty-state">No file selected</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { NButton, NButtonGroup } from 'naive-ui'
import DiffView from '../diff/DiffView.vue'
import { useDiffStore } from '../../stores/diff'
import { useRepoStore } from '../../stores/repo'

const diffStore = useDiffStore()
const repo = useRepoStore()
const mode = ref<'split' | 'unified'>('split')
const diffViewRef = ref<InstanceType<typeof DiffView> | null>(null)

const filePath = computed(() => {
  const selected = repo.activeRepoPath ? diffStore.getSelectedFile(repo.activeRepoPath) : null
  return selected ?? ''
})

const currentFile = computed(() => {
  if (!repo.activeRepoPath || !filePath.value) return null
  const diffs = diffStore.getDiffs(repo.activeRepoPath)
  return diffs.find(f => f.path === filePath.value) ?? null
})

function goPrev() {
  diffViewRef.value?.goToPrevChange()
}

function goNext() {
  diffViewRef.value?.goToNextChange()
}
</script>

<style scoped>
.commit-file-diff-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #1e1e1e;
}
.diff-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid #3c3c3c;
  background: #2d2d2d;
}
.file-path {
  font-family: 'Consolas', monospace;
  font-size: 12px;
  color: #cccccc;
}
.view-controls {
  display: flex;
  gap: 8px;
}
.diff-content {
  flex: 1;
  overflow: hidden;
}
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #6e7681;
}
</style>
```

- [ ] **Step 2: 改造 DiffView.vue 支持 mode 属性**

```vue
<template>
  <div class="diff-view">
    <n-scrollbar>
      <div v-if="mode === 'split'" class="split-view">
        <div class="old-panel">
          <template v-for="(hunk, hi) in file?.hunks" :key="hi">
            <div v-for="(line, li) in hunk.lines" :key="`old-${hi}-${li}`" 
                 class="diff-line"
                 :class="getLineClass(line)">
              <span class="line-number">{{ getOldLineNum(hunk, li) }}</span>
              <span class="line-content">{{ getLineContent(line) }}</span>
            </div>
          </template>
        </div>
        <div class="new-panel">
          <template v-for="(hunk, hi) in file?.hunks" :key="hi">
            <div v-for="(line, li) in hunk.lines" :key="`new-${hi}-${li}`"
                 class="diff-line"
                 :class="getLineClass(line)">
              <span class="line-number">{{ getNewLineNum(hunk, li) }}</span>
              <span class="line-content">{{ getLineContent(line) }}</span>
            </div>
          </template>
        </div>
      </div>
      <div v-else class="unified-view">
        <!-- unified view implementation -->
      </div>
    </n-scrollbar>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { NScrollbar } from 'naive-ui'
import type { FileDiff, Hunk, DiffLine } from '../../types/git'

const props = defineProps<{
  file: FileDiff | null
  mode: 'split' | 'unified'
}>()

const emit = defineEmits<{
  'update:modified': [value: string]
}>()

function getLineClass(line: DiffLine): string {
  if ('Addition' in line) return 'addition'
  if ('Deletion' in line) return 'deletion'
  return 'context'
}

function getLineContent(line: DiffLine): string {
  if ('Addition' in line) return line.Addition
  if ('Deletion' in line) return line.Deletion
  return line.Context
}

let oldLineNum = 0
let newLineNum = 0

function getOldLineNum(hunk: Hunk, idx: number): number {
  const line = hunk.lines[idx]
  if ('Deletion' in line || 'Context' in line) {
    return oldLineNum++
  }
  return ''
}

function getNewLineNum(hunk: Hunk, idx: number): number {
  const line = hunk.lines[idx]
  if ('Addition' in line || 'Context' in line) {
    return newLineNum++
  }
  return ''
}

function goToNextChange() {
  // scroll to next addition/deletion
}

function goToPrevChange() {
  // scroll to previous addition/deletion
}

defineExpose({ goToNextChange, goToPrevChange })
</script>

<style scoped>
.diff-view {
  height: 100%;
}
.split-view {
  display: flex;
  height: 100%;
}
.old-panel, .new-panel {
  flex: 1;
  overflow: auto;
  font-family: 'Consolas', monospace;
  font-size: 13px;
}
.diff-line {
  display: flex;
  min-height: 20px;
}
.line-number {
  width: 50px;
  padding: 0 8px;
  text-align: right;
  color: #6e7681;
  background: #2d2d2d;
  user-select: none;
}
.line-content {
  flex: 1;
  padding: 0 8px;
  white-space: pre;
}
.addition {
  background: rgba(46, 160, 67, 0.15);
}
.addition .line-content::before {
  content: '+';
  color: #3fb950;
}
.deletion {
  background: rgba(248, 81, 73, 0.15);
}
.deletion .line-content::before {
  content: '-';
  color: #f85149;
}
.context {
  background: #1e1e1e;
}
</style>
```

- [ ] **Step 3: Commit**

```bash
cd d:/projects/req2task-2
git add git-client/src/components/commit/CommitFileDiffView.vue git-client/src/components/diff/DiffView.vue
git commit -m "feat: add CommitFileDiffView and update DiffView for split mode"
```

---

### Task 2: 改造 AppContent.vue 添加视图切换

**Files:**
- Modify: `git-client/src/components/layout/AppContent.vue:43-51`

- [ ] **Step 1: 添加视图切换逻辑**

```vue
<template>
  <AppLayout>
    <template v-if="repo.activeRepo">
      <CommitFileDiffView v-if="hasSelectedFile" />
      <CommitList v-else />
    </template>
    <template v-else>
      <RepoPanel @open="handleOpen" />
    </template>
  </AppLayout>
</template>

<script setup lang="ts">
// ... existing imports

const hasSelectedFile = computed(() => {
  if (!repo.activeRepoPath) return false
  return diffStore.getSelectedFile(repo.activeRepoPath) !== null
})

// Add keyboard handler for Escape
onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && hasSelectedFile.value) {
    if (repo.activeRepoPath) {
      diffStore.selectFile(repo.activeRepoPath, null)
    }
  }
}
</script>
```

- [ ] **Step 2: 更新 imports**

```typescript
import { computed, onMounted, onUnmounted } from 'vue'
import CommitFileDiffView from '../commit/CommitFileDiffView.vue'
import { useDiffStore } from '../../stores/diff'
// ... existing
const diffStore = useDiffStore()
```

- [ ] **Step 3: Commit**

```bash
git add git-client/src/components/layout/AppContent.vue
git commit -m "feat: add view switching logic based on selected file"
```

---

### Task 3: 验证功能

**Files:**
- (No file changes)

- [ ] **Step 1: 运行 vue-tsc 类型检查**

```bash
cd d:/projects/req2task-2/git-client
npm run typecheck
```

- [ ] **Step 2: 如有错误，修复并重新检查**

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "fix: resolve typecheck errors"
```

---

## 执行选项

**1. Subagent-Driven (推荐)** - 每个 task 由独立 subagent 执行，task 间有 review

**2. Inline Execution** - 在当前 session 执行，带 checkpoint review

选择哪个方式开始实现？
