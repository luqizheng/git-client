# CommitList Component Design

## Overview

对标 GitKraken 的 Commit List 组件，在现有 Vue 3 + Tauri 项目中完全重写 SourceTreeCommitList.vue。采用混合架构：核心组件重写，复用已验证的图布局算法和 Git 数据获取逻辑。

## Tech Stack

| 层 | 技术 | 用途 |
|---|---|---|
| 前端框架 | Vue 3 Composition API | 组件与逻辑组织 |
| UI 库 | Naive UI | Dropdown 等组件 |
| 样式 | UnoCSS + CSS 变量 | 样式系统 |
| 状态管理 | Pinia + composables | 数据与 UI 状态 |
| 虚拟滚动 | @tanstack/vue-virtual | 大列表性能 |
| 图形绘制 | Canvas 2D API | 分支图渲染 |
| Git 数据 | Tauri IPC (现有) | 保持 Rust git2 架构 |

## Component Architecture

### Directory Structure

```
git-client/src/components/commit/
├── CommitList.vue
├── components/
│   ├── CommitToolbar.vue
│   ├── CommitCanvas.vue
│   ├── CommitRow.vue
│   ├── ContextMenu.vue
│   ├── GroupHeader.vue
│   └── cells/
│       ├── GraphCell.vue
│       ├── MessageCell.vue
│       ├── AuthorCell.vue
│       ├── DateCell.vue
│       └── BranchTagCell.vue
├── composables/
│   ├── useCommitList.ts
│   ├── useVirtualScroll.ts
│   ├── useCommitGraph.ts
│   ├── useInteractions.ts
│   ├── useContextMenu.ts
│   ├── useFilterGroup.ts
│   └── useKeyboardNav.ts
└── utils/
    ├── graphRenderer.ts
    └── commitHelpers.ts
```

### Component Hierarchy

```
CommitList (主容器)
├── CommitToolbar (工具栏)
│   ├── SearchInput
│   ├── GroupToggle
│   └── SortDropdown
├── ScrollContainer
│   ├── Canvas Layer (sticky)
│   │   └── CommitCanvas
│   └── Virtual List
│       ├── GroupHeader
│       └── CommitRow x N
│           ├── GraphCell
│           ├── BranchTagCell
│           ├── MessageCell
│           ├── AuthorCell
│           └── DateCell
└── ContextMenu (Portal)
```

### Responsibility Matrix

| Component | Responsibility |
|-----------|---------------|
| CommitList | 状态编排、事件分发、数据流控制 |
| CommitToolbar | 搜索/排序/分组 UI |
| CommitCanvas | Canvas 绘制、滚动同步 |
| CommitRow | 单行渲染、样式、事件冒泡 |
| ContextMenu | 菜单显示/隐藏、动作执行 |
| GroupHeader | 日期分组标题、折叠控制 |

## Data Flow

### Architecture

```
Rust Backend (git2)
       │ Tauri IPC
       ▼
Pinia Stores (commitsStore / repoStore)
       │
       ▼
useCommitList (编排层)
  ├─ useFilterGroup → filteredCommits[]
  ├─ useTimeGrouping → groupedItems[]
  ├─ useCommitGraph → graph{nodes, connections}
  └─ useVirtualScroll → visibleItems[]
       │
       ▼
Vue Components
```

### State Layers

| Layer | Location | Content | Persistent |
|-------|----------|---------|------------|
| Remote | Pinia store | commits[], branches[], repo state | No |
| Route | URL / store | selectedCommitId, activeRepoPath | Yes (localStorage) |
| UI | composable | filterText, groupToggle, sortDir, collapsed | Partial (localStorage) |
| Interaction | composable | hoveredRow, dragging, contextMenu pos | No (transient) |
| Derived | computed | filteredList, graphData, visibleRows | No (cached) |

### Key Interfaces

```typescript
interface FilterState {
  text: string
  type: 'all' | 'message' | 'author' | 'hash'
}

type GroupedItem =
  | { type: 'group'; key: string; label: string; commitCount: number; collapsed: boolean }
  | { type: 'commit'; commit: Commit; groupKey: string }

interface InteractionState {
  hoveredId: string | null
  selectedIds: Set<string>
  contextMenu: { visible: boolean; x: number; y: number; commit: Commit | null }
  dragState: { dragging: boolean; commitId: string | null }
}

interface KeyboardNavState {
  focusedIndex: number
  mode: 'navigate' | 'search'
}
```

## Graph Rendering Engine

### Dual-Layer Architecture

```
ScrollContainer (overflow-y: auto)
├── Canvas Layer (position: sticky, left: 0)
│   ├── Offscreen Canvas (pre-render)
│   │   - All branch lines (bezier curves)
│   │   - All node circles
│   └── Main Canvas (display)
│       - Copy visible region from offscreen on scroll
└── Virtual List (position: relative)
    ├── GroupHeader x M
    └── CommitRow x N (visible only)
```

### Render Pipeline

```
commits[] → useCommitGraph() → graph{nodes, connections}
                                      │
                                      ▼
                              graphRenderer.render()
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                  ▼
              Draw Lines        Draw Nodes         Draw Labels
           (bezier curves)    (circle/diamond)    (HEAD marker)
                    └─────────────────┼──────────────────┘
                                      ▼
                              Offscreen Canvas Cache
                                      │
                              Scroll Event
                                      ▼
                              Copy visible region to Main Canvas
```

### Line Drawing Rules

- **Straight**: Same lane parent-child → vertical line
- **Fork**: Parent on new lane → bezier curve from node down to new lane
- **Merge**: Child has multiple parents → bezier curves converge to current node

### Node Styles

- Normal commit: solid circle (6px radius)
- Merge commit: double ring (outer 7px, inner 4px)
- HEAD commit: circle + glow animation
- Selected commit: highlight border + background color

### Color Strategy

- Each active branch assigned fixed color (12-color rotation)
- Line color matches target branch color
- Separate color palettes for dark/light themes

### Performance Optimization

| Optimization | Strategy | Effect |
|---|---|---|
| Full render | Offscreen canvas pre-render | Scroll only needs bitmap copy |
| Scroll redraw | requestAnimationFrame throttle | Avoid per-pixel redraw |
| Incremental update | Only redraw on commits change | Reduce invalid computation |
| Regional render | Only draw visible rows | Significant reduction for large lists |

## Interaction System

### State Machine

```
Idle → Hovered (mouseenter)
Idle → Selected (click)
Idle → Dragging (dragstart)
Selected → MultiSelected (ctrl+click / shift+click)
Selected → ContextMenu (right-click)
```

### Action Mapping

| Action | Behavior | Event |
|--------|----------|-------|
| Click row | Select commit, highlight, trigger onCommitSelected | click |
| Ctrl+Click | Toggle multi-select | click + ctrlKey |
| Shift+Click | Range select (last selected → current) | click + shiftKey |
| Right-click | Show context menu | contextmenu |
| Drag row | Start drag, record commit hash | dragstart |
| Drop on branch panel | Trigger cherry-pick | drop |
| ↑ / ↓ | Move focused row | keydown |
| Enter | View selected commit detail | keydown |
| Space | Mark/unmark commit | keydown |
| Ctrl+C | Copy selected commit SHA | keydown |
| / | Focus search input | keydown |
| Escape | Clear search / close menu | keydown |
| Double-click | View full diff | dblclick |

### Context Menu Items

```
Cherry-pick this commit
─────────────────────
Rebase onto this commit...
Reset → Soft
Reset → Mixed
Reset → Hard (red)
─────────────────────
Create Branch here...
Tag this version...
─────────────────────
Copy SHA
Copy commit info
─────────────────────
Scroll to commit
```

### Drag Cherry-pick Flow

```
dragStart(commit) → dragOver(branchPanel) → drop(branchName)
                                                │
                                                ▼
                                    Tauri IPC: cherry_pick(commitId, branchName)
                                                │
                                                ▼
                                    Success → Refresh commits list
                                    Failure → Show conflict alert
```

## Filtering, Grouping & Search

### Filter Flow

```
filterText + filterType → Client-side Filter → filteredCommits[]
```

Matching rules:
- `message`: commit.message contains filterText (case-insensitive)
- `author`: commit.author or commit.author_email contains filterText
- `hash`: commit.id starts with filterText
- `all`: any of the above matches

### Grouping Logic

```
filteredCommits[] → Time Grouping → groupedItems: (GroupHeader | Commit)[]
```

Groups: Today / Yesterday / This Week / Earlier

Collapse state per group, stored in localStorage with key `commit-list-group-${groupKey}`.

### Search UX

- Real-time filter on input event (300ms debounce)
- Show match count in search box
- Highlight matched text in MessageCell
- Escape clears search and restores focus

## Performance Targets

| Metric | Target | Implementation |
|--------|--------|---------------|
| First render | < 200ms | Virtual scroll + data prefetch |
| Scroll FPS | 60fps | Canvas cache + rAF throttle |
| Search response | < 100ms | Client filter + debounce |
| Memory (10k commits) | < 50MB | Virtual list holds only visible DOM |

## Theme Support

CSS variables (continuing existing theme system):

```css
/* Dark Theme (default) */
--commit-row-height: 40px
--commit-bg: #1a1a1a
--commit-bg-hover: rgba(255, 255, 255, 0.05)
--commit-bg-selected: rgba(59, 130, 246, 0.3)
--commit-text: #e0e0e0
--commit-text-secondary: #969696
--commit-border: #3c3c3c
--graph-lane-width: 16px

/* Light Theme */
--commit-bg: #ffffff
--commit-bg-hover: rgba(0, 0, 0, 0.04)
--commit-bg-selected: rgba(59, 130, 246, 0.15)
--commit-text: #1a1a1a
--commit-text-secondary: #666666
--commit-border: #e0e0e0
```

## Additional Features

- **Scroll to commit**: Input hash in search → scrollToIndex + flash highlight
- **Copy Commit Info**: Formatted output `hash | author | date | message`
- **Virtual scroll + infinite load**: Auto fetchNextPage on scroll to bottom

## Scope

This design covers the CommitList component only. Related components (CommitDetailPanel, StageArea, etc.) are out of scope but will be updated to integrate with the new CommitList interface.
