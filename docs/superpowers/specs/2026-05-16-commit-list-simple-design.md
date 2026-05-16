# CommitList 组件设计

## Overview

简洁的 Commit 列表组件，显示 Hash + Message + Author + Date 四列，支持全文搜索、无限滚动加载、右键菜单。暂不实现 graph 图形，后续扩展预留接口。

## Tech Stack

| 层 | 技术 | 用途 |
|---|---|---|
| 前端框架 | Vue 3 Composition API | 组件与逻辑组织 |
| UI 库 | Naive UI | NDropdown 右键菜单 |
| 样式 | UnoCSS + CSS 变量 | 样式系统 |
| 状态管理 | Pinia + composables | 数据与 UI 状态 |
| 虚拟滚动 | @tanstack/vue-virtual | 大列表性能 |

## Component Architecture

### Directory Structure

```
src/components/commit/
├── components/
│   ├── commit-list/
│   │   └── commit-list.vue          # 主容器
│   └── cells/
│       ├── HashCell.vue             # SHA 显示
│       ├── MessageCell.vue          # 提交信息（支持高亮）
│       ├── AuthorCell.vue           # 作者
│       └── DateCell.vue             # 相对时间
├── composables/
│   ├── useCommitList.ts            # 主编排 composable
│   ├── useFilter.ts                # 搜索过滤逻辑
│   └── useInfiniteScroll.ts        # 无限滚动加载
└── utils/
    └── commitHelpers.ts            # 工具函数（已存在）
```

### Component Hierarchy

```
CommitList (主容器)
├── Toolbar
│   └── SearchInput (全文搜索)
├── ColumnHeader (Hash | Message | Author | Date)
├── ScrollContainer
│   └── VirtualList
│       └── CommitRow x N
│           ├── HashCell
│           ├── MessageCell (高亮搜索词)
│           ├── AuthorCell
│           └── DateCell
└── ContextMenu (NDropdown, Portal)
```

### Responsibility Matrix

| Component | Responsibility |
|-----------|---------------|
| CommitList | 状态编排、事件分发、数据流控制 |
| CommitRow | 单行渲染、样式、事件冒泡 |
| ContextMenu | 菜单显示/隐藏、动作执行、图标渲染 |

## Data Flow

### Architecture

```
Rust Backend (git2)
       │ Tauri IPC
       ▼
Pinia Stores (commitsStore / repoStore)
       │
       ▼
useCommitList (主编排)
  ├── useFilter → filteredCommits[]
  └── useInfiniteScroll → 加载更多
       │
       ▼
Vue Components
```

### State Layers

| Layer | Location | Content | Persistent |
|-------|----------|---------|------------|
| Remote | Pinia store | commits[], branches[], repo state | No |
| UI | composable | filterText, menuState | Partial |
| Interaction | composable | hoveredId, selectedId | No |
| Derived | computed | filteredCommits | No |

## Context Menu Items

```
Cherry-pick this commit           🍒
─────────────────────────
Rebase onto this commit...        🔀
Reset → Soft                      ↩
Reset → Mixed
Reset → Hard                      ⚠
─────────────────────────
Create Branch here...             🌿
Tag this version...                🏷
─────────────────────────
Copy SHA                          📋
Copy commit info
─────────────────────────
View diff                         📄
Scroll to HEAD                    ⬆
```

## Filter Logic

全文搜索，同时匹配：
- commit.message
- commit.author
- commit.author_email
- commit.id (前缀匹配)

## Interaction System

| Action | Behavior |
|--------|----------|
| Click row | Select commit |
| Right-click | Show context menu |
| Scroll to bottom | Load more commits (infinite scroll) |
| Type in search | Filter commits in real-time |

## Theme Support

CSS 变量（沿用现有主题系统）：

```css
/* Dark Theme */
--commit-row-height: 40px
--commit-bg: transparent
--commit-bg-hover: rgba(255, 255, 255, 0.05)
--commit-bg-selected: rgba(59, 130, 246, 0.3)
--commit-text: #e0e0e0
--commit-text-secondary: #969696

/* Light Theme */
--commit-bg: transparent
--commit-bg-hover: rgba(0, 0, 0, 0.04)
--commit-bg-selected: rgba(59, 130, 246, 0.15)
--commit-text: #1a1a1a
--commit-text-secondary: #666666
```

## Scope

本设计覆盖：
- CommitList 主容器
- CommitRow 单行组件
- 四个 Cell 组件
- ContextMenu 右键菜单
- useCommitList / useFilter / useInfiniteScroll composables

暂不覆盖：
- Graph 分支图形（后续扩展）
- Canvas 渲染
- 键盘导航
- 分组折叠

## Graph 预留接口

```typescript
interface CommitRowProps {
  // 现有
  commit: Commit
  isSelected: boolean
  isHovered: boolean
  searchQuery?: string

  // 预留（后续 graph 扩展）
  graphNode?: GraphNode
  graphLane?: number
}
```
