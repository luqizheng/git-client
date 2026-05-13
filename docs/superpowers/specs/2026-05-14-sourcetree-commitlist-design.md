# SourceTree 风格 CommitList 设计规范

> **日期:** 2026-05-14
> **方案:** B - 纯手写组件
> **状态:** ✅ 已批准

## 1. 概述

将 `CommitList.vue` 改造为 SourceTree 风格的 commit 历史视图，支持：
- 可调整列宽的多列布局
- DAG 有向无环图渲染
- 时间分组显示
- 右键操作菜单（Cherry-pick/Rebase/Reset）
- 拖放分支合并/变基
- Solo/Hide 分支筛选

## 2. 架构设计

### 2.1 文件结构

```
src/components/commit/
├── SourceTreeCommitList.vue      # 主容器组件
├── components/
│   ├── ColumnHeader.vue          # 可拖拽调整列头
│   ├── TimeGroupHeader.vue       # 时间分组标题
│   ├── CommitRow.vue             # 单行组件
│   ├── BranchTagCell.vue         # 分支标签单元格
│   ├── GraphCell.vue             # DAG 图形单元格
│   └── CommitContextMenu.vue     # 右键菜单
├── composables/
│   ├── useResizableColumns.ts    # 列宽调整逻辑
│   ├── useVirtualScroll.ts       # 虚拟滚动逻辑
│   ├── useDragDrop.ts            # 拖放逻辑
│   └── useTimeGrouping.ts        # 时间分组逻辑
```

### 2.2 列定义

| 列 Key | 标签 | 默认宽度 | 最小 | 最大 | 可调 | 固定位置 |
|--------|------|----------|------|------|------|----------|
| branch | BRANCH / TAG | 140px | 80px | 250px | ✅ | left |
| graph | GRAPH | 120px | 80px | 200px | ✅ | - |
| message | COMMIT MESSAGE | flex:1 | 200px | 600px | ✅ | - |
| author | AUTHOR | 100px | 60px | 150px | ✅ | right |
| date | DATE / TIME | 150px | 120px | 200px | ✅ | right |

## 3. 组件详细设计

### 3.1 SourceTreeCommitList.vue (主容器)

**职责：**
- 管理整体布局和滚动
- 协调子组件通信
- 处理全局事件

**Props：**
```typescript
interface Props {
  commits: Commit[]
  selectedCommitId: string | null
}
```

**Emits：**
```typescript
interface Emits {
  'select': [commit: Commit]
  'cherry-pick': [commitId: string]
  'rebase': [branch: string, onto: string]
  'reset': [commitId: string, mode: ResetMode]
  'solo-branch': [branchName: string]
  'hide-branch': [branchName: string]
  'show-all': []
}
```

**Template 结构：**
```vue
<template>
  <div class="source-tree-commit-list">
    <!-- 工具栏 -->
    <div class="toolbar">
      <button @click="showAllBranches">👁️ Show All</button>
    </div>

    <!-- 列头 -->
    <ColumnHeader 
      :columns="columns"
      @resize="handleColumnResize"
    />

    <!-- 虚拟滚动容器 -->
    <div 
      ref="scrollContainer"
      class="scroll-container"
      @scroll="handleScroll"
    >
      <!-- 渲染可视行 -->
      <div :style="{ height: totalHeight + 'px' }">
        <TimeGroupHeader
          v-for="group in visibleGroups"
          :key="group.key"
          :group="group"
          :style="{ transform: `translateY(${group.offset}px)` }"
        />
        
        <CommitRow
          v-for="row in visibleRows"
          :key="row.commit.id"
          :commit="row.commit"
          :columns="columns"
          :selected="row.commit.id === selectedCommitId"
          :style="{ transform: `translateY(${row.offset}px)` }"
          @click="$emit('select', row.commit)"
          @contextmenu="handleContextMenu($event, row.commit)"
        />
      </div>
    </div>

    <!-- 右键菜单 -->
    <CommitContextMenu
      v-if="contextMenu.visible"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :commit="contextMenu.commit"
      @close="closeContextMenu"
      @action="handleMenuAction"
    />
  </div>
</template>
```

### 3.2 ColumnHeader.vue (列头)

**功能：**
- 显示列标签
- 拖拽调整宽度
- 固定列定位

**交互：**
1. 鼠标悬停在列分隔线上 → 光标变为 col-resize
2. mousedown → 开始拖拽
3. mousemove → 实时更新宽度
4. mouseup → 结束拖拽，保存到 localStorage

**样式要点：**
```css
.column-header {
  display: flex;
  height: 32px;
  background: var(--bg-secondary, #252526);
  border-bottom: 1px solid var(--border-color, #3c3c3c);
}

.column-header-cell {
  padding: 0 8px;
  display: flex;
  align-items: center;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary, #969696);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  position: relative;
}

.resize-handle {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  cursor: col-resize;
  opacity: 0;
  transition: opacity 0.15s;
}

.column-header-cell:hover .resize-handle {
  opacity: 1;
  background: var(--accent-color, #0078d4);
}
```

### 3.3 TimeGroupHeader.vue (时间分组)

**分组规则：**
```typescript
function getTimeGroup(timestamp: number): { key: string; label: string } {
  const now = new Date()
  const date = new Date(timestamp * 1000)
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000)

  if (diffDays === 0) return { key: 'today', label: 'Today' }
  if (diffDays === 1) return { key: 'yesterday', label: 'Yesterday' }
  if (diffDays < 7) return { key: 'this-week', label: 'This Week' }
  if (diffDays < 30) return { key: 'this-month', label: 'This Month' }
  return { key: 'older', label: 'Older' }
}
```

**UI 表现：**
```vue
<template>
  <div class="time-group-header" :style="{ width: totalWidth }">
    <span class="group-label">{{ group.label }}</span>
    <span class="group-count">{{ group.count }} commits</span>
  </div>
</template>

<style scoped>
.time-group-header {
  height: 28px;
  background: var(--group-header-bg, rgba(255,255,255,0.03));
  border-top: 1px solid var(--border-color, #3c3c3c);
  border-bottom: 1px solid var(--border-color, #3c3c3c);
  display: flex;
  align-items: center;
  padding: 0 12px;
  gap: 8px;
}

.group-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary, #e0e0e0);
}

.group-count {
  font-size: 11px;
  color: var(--text-tertiary, #6a6a6a);
}
</style>
```

### 3.4 CommitRow.vue (单行)

**结构：**
```vue
<template>
  <div 
    class="commit-row"
    :class="{ selected, 'drag-over': isDragOver }"
    :style="rowStyle"
  >
    <BranchTagCell :commit="commit" :width="getColumnWidth('branch')" />
    <GraphCell :commit="commit" :width="getColumnWidth('graph')" />
    <MessageCell :commit="commit" :width="getColumnWidth('message')" />
    <AuthorCell :commit="commit" :width="getColumnWidth('author')" />
    <DateCell :commit="commit" :width="getColumnWidth('date')" />
  </div>
</template>

<style scoped>
.commit-row {
  height: 40px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid transparent;
  transition: background-color 0.15s ease;
  cursor: pointer;
}

.commit-row:hover {
  background: var(--row-hover, rgba(255,255,255,0.05));
}

.commit-row.selected {
  background: var(--row-selected, rgba(59,130,246,0.3));
}

.commit-row.drag-over {
  outline: 2px solid var(--drag-over-border, #3b82f6);
  outline-offset: -2px;
}
</style>
```

### 3.5 BranchTagCell.vue (分支标签)

**功能：**
- 显示当前 commit 关联的分支/tag
- 支持拖拽起始点
- Solo/Hide 快捷操作

**UI 设计：**
```vue
<template>
  <div class="branch-tag-cell" :style="{ width }">
    <div
      v-for="ref in branchRefs"
      :key="ref.name"
      class="branch-tag"
      :class="[ref.type, { 'is-head': ref.isHead }]"
      draggable="true"
      @dragstart="handleDragStart($event, ref)"
    >
      <span class="tag-icon" v-if="ref.isHead">📌</span>
      <span class="tag-name">{{ truncate(ref.name, 15) }}</span>
      
      <!-- Hover 操作按钮 -->
      <div class="tag-actions">
        <button @click.stop="$emit('solo', ref.name)" title="Solo">👁️</button>
        <button @click.stop="$emit('hide', ref.name)" title="Hide">👁️‍🗨️</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.branch-tag-cell {
  padding: 0 8px;
  overflow: hidden;
}

.branch-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  margin: 2px 4px 2px 0;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
  cursor: grab;
  transition: all 0.15s ease;
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

.tag-actions {
  display: none;
  gap: 2px;
  margin-left: 4px;
}

.branch-tag:hover .tag-actions {
  display: inline-flex;
}
</style>
```

### 3.6 GraphCell.vue (DAG 图形)

**复用现有 GraphColumn 逻辑，但改为单元格模式**

**关键改动：**
- 移除独立滚动，由父容器控制
- 接收单个 commit 的 lane 信息
- 保持 SVG 渲染性能优化

### 3.7 CommitContextMenu.vue (右键菜单)

**菜单项定义：**
```typescript
interface MenuItem {
  id: string
  label: string
  icon?: string
  shortcut?: string
  divider?: boolean
  disabled?: boolean
  danger?: boolean
  action: () => void
}

const menuItems: MenuItem[] = [
  { id: 'cherry-pick', label: 'Cherry-pick this commit', icon: '🍒' },
  { id: 'divider-1', label: '', divider: true },
  { id: 'rebase', label: 'Rebase current branch onto this...', icon: '🔀' },
  { id: 'reset-soft', label: 'Reset to this commit (Soft)', icon: '↩️' },
  { id: 'reset-mixed', label: 'Reset to this commit (Mixed)', icon: '↩️' },
  { id: 'reset-hard', label: 'Reset to this commit (Hard)', icon: '↩️', danger: true },
  { id: 'divider-2', label: '', divider: true },
  { id: 'create-branch', label: 'Create Branch here...', icon: '🌿', shortcut: 'B' },
  { id: 'create-tag', label: 'Tag this version...', icon: '🏷️', shortcut: 'T' },
  { id: 'divider-3', label: '', divider: true },
  { id: 'copy-sha', label: 'Copy SHA', icon: '📋', shortcut: 'Ctrl+C' },
  { id: 'show-history', label: 'Show in File History', icon: '📁' },
]
```

## 4. Composables 设计

### 4.1 useResizableColumns.ts

```typescript
const STORAGE_KEY = 'commit-list-columns'

export function useResizableColumns() {
  const columns = ref<ColumnConfig[]>(loadFromStorage())

  function resizeColumn(key: string, newWidth: number) {
    const col = columns.value.find(c => c.key === key)
    if (!col) return
    
    col.width = clamp(newWidth, col.minWidth, col.maxWidth)
    saveToStorage(columns.value)
  }

  function resetColumns() {
    columns.value = getDefaultColumns()
    saveToStorage(columns.value)
  }

  return { columns, resizeColumn, resetColumns }
}
```

### 4.2 useVirtualScroll.ts

```typescript
export function useVirtualScroll(containerRef, items, rowHeight = 40) {
  const scrollTop = ref(0)
  const containerHeight = ref(600)
  
  const BUFFER_ROWS = 5
  
  const visibleRange = computed(() => {
    const startRow = Math.floor(scrollTop.value / rowHeight)
    return {
      start: Math.max(0, startRow - BUFFER_ROWS),
      end: Math.min(items.value.length, startRow + Math.ceil(containerHeight.value / rowHeight) + BUFFER_ROWS)
    }
  })
  
  const visibleItems = computed(() => 
    items.value.slice(visibleRange.value.start, visibleRange.value.end)
  )
  
  const totalHeight = computed(() => items.value.length * rowHeight)
  
  function handleScroll(e: Event) {
    scrollTop.value = (e.target as HTMLElement).scrollTop
  }
  
  return { scrollTop, containerHeight, visibleRange, visibleItems, totalHeight, handleScroll }
}
```

### 4.3 useDragDrop.ts

```typescript
export function useDragDrop() {
  const dragState = reactive({
    isDragging: false,
    sourceType: null as 'branch' | null,
    sourceData: null as any,
    targetCommit: null as Commit | null,
  })
  
  function onDragStart(type: string, data: any) {
    dragState.isDragging = true
    dragState.sourceType = type
    dragState.sourceData = data
  }
  
  function onDragOver(commit: Commit) {
    if (dragState.sourceType === 'branch') {
      dragState.targetCommit = commit
    }
  }
  
  function onDrop(): DragDropResult | null {
    if (!dragState.isDragging || !dragState.targetCommit) return null
    
    const result = {
      sourceType: dragState.sourceType!,
      sourceData: dragState.sourceData,
      targetCommit: dragState.targetCommit,
    }
    
    reset()
    return result
  }
  
  function reset() {
    dragState.isDragging = false
    dragState.sourceType = null
    dragState.sourceData = null
    dragState.targetCommit = null
  }
  
  return { dragState, onDragStart, onDragOver, onDrop, reset }
}
```

## 5. 后端 API 扩展

### 5.1 新增命令

#### cherry_pick.rs
```rust
#[tauri::command]
pub async fn cherry_pick(
    state: State<'_, AppState>,
    repo_path: String,
    commit_id: String,
) -> Result<CherryPickResult, AppError>
```

#### rebase.rs
```rust
#[tauri::command]
pub async fn rebase_onto(
    state: State<'_, AppState>,
    repo_path: String,
    branch_name: String,
    upstream_commit_id: String,
) -> Result<RebaseResult, AppError>
```

#### reset.rs
```rust
#[tauri::command]
pub async fn reset_commit(
    state: State<'_, AppState>,
    repo_path: String,
    commit_id: String,
    mode: ResetMode, // "soft" | "mixed" | "hard"
) -> Result<(), AppError>
```

### 5.2 返回类型扩展

```rust
// models/commit.rs 新增
pub struct CherryPickResult {
    pub commit_id: String,
    pub had_conflicts: bool,
    pub conflicts: Vec<ConflictFile>,
}

pub struct RebaseResult {
    pub success: bool,
    pub new_head_id: Option<String>,
    pub conflicts: Vec<ConflictFile>,
}

pub enum ResetMode {
    Soft,
    Mixed,
    Hard,
}
```

## 6. 样式系统

### 6.1 CSS 变量

```css
:root {
  /* 分支颜色 */
  --branch-1: #4fc3f7;
  --branch-2: #81c784;
  --branch-3: #fff176;
  --branch-4: #ff8a65;
  --branch-5: #ba68c8;
  --branch-6: #f06292;
  --branch-7: #4db6ac;
  --branch-8: #aed581;
  --branch-9: #90a4ae;
  --branch-10: #ffb74d;
  --branch-11: #e57373;
  --branch-12: #64b5f6;

  /* 状态颜色 */
  --bg-primary: #1a1a1a;
  --bg-secondary: #252526;
  --bg-hover: rgba(255, 255, 255, 0.05);
  --bg-selected: rgba(59, 130, 246, 0.3);
  --bg-group-header: rgba(255, 255, 255, 0.03);
  
  /* 边框 */
  --border-color: #3c3c3c;
  --border-active: #0078d4;
  
  /* 文字 */
  --text-primary: #e0e0e0;
  --text-secondary: #969696;
  --text-tertiary: #6a6a6a;
  
  /* 交互 */
  --drag-over-border: #3b82f6;
  --accent-color: #0078d4;
  --danger-color: #ef4444;
}
```

### 6.2 字体规范

```css
/* 提交哈希 */
.font-commit-hash {
  font-family: 'JetBrains Mono', 'Consolas', monospace;
  font-size: 12px;
  font-weight: 400;
}

/* 分支标签 */
.font-branch-tag {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.2px;
}

/* 作者名 */
.font-author {
  font-size: 12px;
  font-weight: 400;
}

/* 时间 */
.font-date {
  font-size: 11px;
  color: var(--text-secondary);
}

/* 列头 */
.font-column-header {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
```

## 7. 性能优化策略

### 7.1 虚拟滚动
- 仅渲染可视区域内的行（±5 行 buffer）
- 使用 CSS transform 定位而非 DOM 操作
- 时间分组头作为特殊行插入

### 7.2 图形渲染
- SVG 复用：相同路径缓存
- requestAnimationFrame 节流
- 离屏 canvas 预渲染（可选）

### 7.3 事件处理
- 右键菜单使用 contextmenu 事件（非 click）
- 拖放使用 HTML5 Drag and Drop API
- 列宽调整使用 passive 事件监听

## 8. 测试计划

### 8.1 单元测试
- `useResizableColumns`: 列宽调整、边界值、持久化
- `useVirtualScroll`: 可视范围计算、滚动同步
- `useTimeGrouping`: 分组规则、边界时间
- `useDragDrop`: 拖放状态管理、重置逻辑

### 8.2 组件测试
- ColumnHeader: 拖拽交互、固定列定位
- CommitRow: 选中态、hover 态、拖放目标高亮
- BranchTagCell: 拖拽起始、Solo/Hide 操作
- CommitContextMenu: 菜单显示/隐藏、快捷键

### 8.3 E2E 测试
- 完整用户流程：浏览历史 → 选择 commit → 右键操作
- 拖放流程：拖动分支 → 目标高亮 → 释放 → 弹出确认
- 筛选流程：Solo 分支 → 验证只显示该分支提交

## 9. 实现优先级

### Phase 1: 基础框架 (P0)
1. SourceTreeCommitList 主容器
2. ColumnHeader + 列宽调整
3. CommitRow + 各 Cell 组件
4. 虚拟滚动实现

### Phase 2: 核心功能 (P0)
5. GraphCell DAG 图形集成
6. TimeGroupHeader 时间分组
7. 相对时间显示优化

### Phase 3: 高级交互 (P1)
8. CommitContextMenu 右键菜单
9. useDragDrop 拖放基础
10. Solo/Hide 分支筛选

### Phase 4: 后端集成 (P1)
11. cherry_pick 命令
12. rebase_onto 命令
13. reset_commit 命令

### Phase 5: 打磨优化 (P2)
14. 键盘快捷键支持
15. 动画过渡效果
16. 无障碍访问 (a11y)

## 10. 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 虚拟滚动与时间分组冲突 | UI 错误 | 将分组头作为特殊行处理，参与虚拟滚动计算 |
| 大仓库 (>10000 commits) 性能 | 卡顿 | 增大 buffer、使用 Web Worker 计算布局 |
| 拖放跨组件通信复杂 | Bug 多 | 使用 provide/inject 或 Pinia store 集中管理状态 |
| 后端 git 操作耗时 | UI 冻结 | 异步执行 + 进度条反馈 |
