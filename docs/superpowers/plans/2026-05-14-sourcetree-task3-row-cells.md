# Task 3: CommitRow + Cell 组件

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** 实现 CommitRow.vue 和所有 Cell 子组件（BranchTagCell、GraphCell 占位、MessageCell、AuthorCell、DateCell）

**Architecture:** CommitRow 使用 flex 布局排列 Cell，各 Cell 接收 width prop。BranchTagCell 支持 draggable 和 Solo/Hide 操作

**Tech Stack:** Vue 3, TypeScript

**Depends:** Task 2（主容器）

---

**Files:**
- Modify: `src/components/commit/components/CommitRow.vue` (替换占位)
- Create: `src/components/commit/components/BranchTagCell.vue`
- Create: `src/components/commit/components/MessageCell.vue`
- Create: `src/components/commit/components/AuthorCell.vue`
- Create: `src/components/commit/components/DateCell.vue`
- Modify: `src/components/commit/components/GraphCell.vue` (占位 div)

- [ ] **Step 1: 创建 BranchTagCell.vue**

```vue
<template>
  <div class="branch-tag-cell" :style="{ width: width + 'px' }">
    <template v-for="ref in commit.refs" :key="ref.name">
      <div
        v-if="ref.ref_type !== 'tag' || true"
        class="branch-tag"
        :class="[ref.ref_type, { 'is-head': ref.is_head }]"
        draggable="true"
        @dragstart="handleDragStart($event, ref)"
      >
        <svg v-if="ref.is_head" class="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 16 16">
          <circle cx="8" cy="8" r="4"/>
        </svg>
        <span class="tag-name">{{ truncate(ref.name, 15) }}</span>
        <div class="tag-actions">
          <button class="action-btn" @click.stop="$emit('solo', ref.name)" title="Solo this branch">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
            </svg>
          </button>
          <button class="action-btn" @click.stop="$emit('hide', ref.name)" title="Hide this branch">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M3 3l18 18"/>
            </svg>
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { Commit, CommitRef } from '../../../types/git'

const props = defineProps<{
  commit: Commit
  width: number
}>()

defineEmits<{
  solo: [branchName: string]
  hide: [branchName: string]
}>()

function truncate(str: string, maxLen: number): string {
  return str.length <= maxLen ? str : str.slice(0, maxLen - 1) + '\u2026'
}

function handleDragStart(e: DragEvent, ref: CommitRef) {
  e.dataTransfer!.setData('text/plain', ref.name)
  e.dataTransfer!.effectAllowed = 'move'
}
</script>

<style scoped>
.branch-tag-cell {
  padding: 0 8px;
  overflow: hidden;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px;
}

.branch-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
  cursor: grab;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.branch-tag.local {
  background: rgba(76, 175, 80, 0.15);
  color: #81c784;
  border: 1px solid rgba(76, 175, 80, 0.3);
}

.branch-tag.remote {
  background: rgba(33, 150, 243, 0.15);
  color: #64b5f6;
  border: 1px solid rgba(33, 150, 243, 0.3);
}

.branch-tag.tag {
  background: rgba(156, 39, 176, 0.15);
  color: #ba68c8;
  border: 1px solid rgba(156, 39, 176, 0.3);
}

.branch-tag.is-head {
  box-shadow: 0 0 0 1px currentColor;
}

.tag-name {
  overflow: hidden;
  text-overflow: ellipsis;
}

.tag-actions {
  display: none;
  gap: 2px;
  margin-left: 4px;
}

.branch-tag:hover .tag-actions {
  display: inline-flex;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  opacity: 0.7;
}

.action-btn:hover {
  opacity: 1;
}
</style>
```

- [ ] **Step 2: 创建 MessageCell.vue**

```vue
<template>
  <div class="message-cell" :style="{ width: width + 'px' }">
    <span class="commit-hash font-mono">{{ commit.id.slice(0, 7) }}</span>
    <span class="commit-message">{{ firstLine }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Commit } from '../../../types/git'

const props = defineProps<{
  commit: Commit
  width: number
}>()

const firstLine = computed(() => props.commit.message.split('\n')[0])
</script>

<style scoped>
.message-cell {
  padding: 0 8px;
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.commit-hash {
  font-size: 12px;
  color: #4fc3f7;
  flex-shrink: 0;
}

.commit-message {
  font-size: 12px;
  color: var(--text-primary, #e0e0e0);
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}
</style>
```

- [ ] **Step 3: 创建 AuthorCell.vue**

```vue
<template>
  <div class="author-cell" :style="{ width: width + 'px' }">
    <span class="author-name">{{ commit.author }}</span>
  </div>
</template>

<script setup lang="ts">
import type { Commit } from '../../../types/git'
defineProps<{ commit: Commit; width: number }>()
</script>

<style scoped>
.author-cell {
  padding: 0 8px;
  overflow: hidden;
  display: flex;
  align-items: center;
}
.author-name {
  font-size: 12px;
  color: var(--text-secondary, #969696);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
```

- [ ] **Step 4: 创建 DateCell.vue**

```vue
<template>
  <div class="date-cell" :style="{ width: width + 'px' }">
    <span class="date-text">{{ relativeTime }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Commit } from '../../../types/git'

const props = defineProps<{
  commit: Commit
  width: number
}>()

const relativeTime = computed(() => {
  const diff = Math.floor(Date.now() / 1000) - props.commit.time
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`
  return new Date(props.commit.time * 1000).toLocaleDateString()
})
</script>

<style scoped>
.date-cell {
  padding: 0 8px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}
.date-text {
  font-size: 11px;
  color: var(--text-tertiary, #6a6a6a);
  white-space: nowrap;
}
</style>
```

- [ ] **Step 5: 创建 GraphCell.vue (纯占位 div)**

```vue
<template>
  <div class="graph-cell" :style="{ width: width + 'px' }" />
</template>

<script setup lang="ts">
defineProps<{ width: number }>()
</script>

<style scoped>
.graph-cell {
  flex-shrink: 0;
}
</style>
```

- [ ] **Step 6: 实现 CommitRow.vue**

替换 Task 2 中的占位版本：

```vue
<template>
  <div
    class="commit-row"
    :class="{ selected, 'drag-over': isDragOver }"
    :style="{ transform: `translateY(${offset}px)` }"
    @click="$emit('click')"
    @contextmenu="$emit('contextmenu', $event)"
    @dragover.prevent="$emit('dragover')"
    @dragleave="$emit('dragleave')"
  >
    <BranchTagCell
      :commit="commit"
      :width="getColumnWidth('branch')"
      class="col-branch"
      @solo="$emit('solo', $event)"
      @hide="$emit('hide', $event)"
    />
    <GraphCell :width="getColumnWidth('graph')" />
    <MessageCell :commit="commit" :width="getColumnWidth('message')" />
    <AuthorCell :commit="commit" :width="getColumnWidth('author')" class="col-author" />
    <DateCell :commit="commit" :width="getColumnWidth('date')" class="col-date" />
  </div>
</template>

<script setup lang="ts">
import type { Commit } from '../../../types/git'
import type { ColumnConfig } from '../composables/useResizableColumns'
import BranchTagCell from './BranchTagCell.vue'
import GraphCell from './GraphCell.vue'
import MessageCell from './MessageCell.vue'
import AuthorCell from './AuthorCell.vue'
import DateCell from './DateCell.vue'

const props = defineProps<{
  commit: Commit
  columns: ColumnConfig[]
  selected: boolean
  isDragOver: boolean
  offset?: number
}>()

defineEmits<{
  click: []
  contextmenu: [event: MouseEvent]
  dragover: []
  dragleave: []
  solo: [branchName: string]
  hide: [branchName: string]
}>()

function getColumnWidth(key: string): number {
  return props.columns.find(c => c.key === key)?.width ?? 100
}
</script>

<style scoped>
.commit-row {
  height: 40px;
  display: flex;
  align-items: center;
  position: absolute;
  left: 0;
  right: 0;
  cursor: pointer;
  transition: background-color 0.15s ease;
  border-bottom: 1px solid transparent;
}

.commit-row::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.commit-row:hover::before {
  background: var(--row-hover, rgba(255, 255, 255, 0.05));
}

.commit-row.selected::before {
  background: var(--row-selected, rgba(59, 130, 246, 0.3));
}

.commit-row.drag-over {
  outline: 2px solid var(--drag-over-border, #3b82f6);
  outline-offset: -2px;
}

.col-branch {
  position: sticky;
  left: 0;
  z-index: 2;
  background: var(--bg-primary, #1a1a1a);
}

.col-author {
  position: sticky;
  z-index: 2;
  background: var(--bg-primary, #1a1a1a);
}

.col-date {
  position: sticky;
  right: 0;
  z-index: 2;
  background: var(--bg-primary, #1a1a1a);
}
</style>
```

- [ ] **Step 7: 验证构建**

Run: `cd d:\projects\req2task-2\git-client; npx vite build`

Expected: 成功

- [ ] **Step 8: Commit**

```bash
git add src/components/commit/components/
git commit -m "feat: implement CommitRow and Cell components with sticky columns"
```
