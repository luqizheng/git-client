# Commit 文件 Diff 集成 Spec

## Why
当前点击 commit 文件后无法查看 diff，需要在主区域显示文件对比，提升代码审查体验。

## What Changes
- 改造 AppContent.vue，根据选中状态显示不同视图
- 创建 CommitFileDiffView.vue，主区域显示选中文件的 diff
- 保留 CommitDetails.vue + ChangedFilesList.vue 在右侧面板
- DiffView 支持双列显示

## Impact
- Affected specs: commit-detail-visual-upgrade
- Affected code:
  - `git-client/src/components/layout/AppContent.vue`
  - `git-client/src/components/commit/CommitFileDiffView.vue` (新建)
  - `git-client/src/components/diff/DiffView.vue` (改造)

## Layout Structure

```
┌──────┬─────────────────────────────┬──────────────┐
│      │                             │              │
│ Side │  View A or View B          │  Commit     │
│ bar  │                             │  Details     │
│      │                             │  + Files     │
└──────┴─────────────────────────────┴──────────────┘

View A: Commit List (默认状态)
View B: CommitFileDiffView (选中文件时)
```

## View States

### State 1: Default (无选中)
- 中间：CommitList
- 右侧：隐藏

### State 2: Commit Selected (未选文件)
- 中间：CommitList
- 右侧：CommitDetails + ChangedFilesList

### State 3: File Selected
- 中间：CommitFileDiffView (双列 diff)
- 右侧：CommitDetails + ChangedFilesList

## ADDED Requirements

### Requirement: 文件 Diff 双列显示
在主区域显示选中文件的 diff，采用双列布局

#### Scenario: 显示文件 diff
- **WHEN** 用户点击 ChangedFilesList 中的某个文件
- **THEN** 主区域切换为双列 diff 视图，左侧旧文件，右侧新文件
- **AND** 右侧面板保留 commit 详情和文件列表

### Requirement: Diff 视图切换
支持 Split/Unified 两种视图模式

#### Scenario: 切换视图
- **WHEN** 用户点击 Split/Unified 按钮
- **THEN** diff 视图在双列和统一模式间切换
- **AND** 记住用户偏好

### Requirement: 变更导航
支持上/下一个变更跳转

#### Scenario: 导航变更
- **WHEN** 用户点击 Prev/Next 按钮
- **THEN** 滚动到上一个/下一个变更位置

### Requirement: 返回 Commit List
选中文件后，可以通过某种方式返回只显示 Commit List

#### Scenario: 返回列表
- **WHEN** 用户按下 Escape 或点击空白区域
- **THEN** 主区域切回 Commit List

### Requirement: 文件路径显示
Diff 视图顶部显示当前文件路径

#### Scenario: 显示路径
- **WHEN** Diff 视图显示
- **THEN** 顶部显示完整文件路径

## Component Design

### CommitFileDiffView.vue
```
┌─────────────────────────────────────────────┐
│ 文件路径: src/components/CommitDetails.vue  │
├─────────────────────────────────────────────┤
│ [Split] [Unified] [← Prev] [Next →]        │
├─────────────────────┬───────────────────────┤
│ - old content       │ + new content         │
│   unchanged         │   unchanged           │
│ - deleted line      │ + added line          │
│   unchanged         │   unchanged           │
└─────────────────────┴───────────────────────┘
```

### DiffView.vue 改造
- 从 CommitDetails 中提取 diff 显示逻辑
- 支持 Split/Unified 切换
- 支持 Prev/Next 导航
- 显示文件路径

## Data Flow

1. 用户点击文件 → `diffStore.selectFile()`
2. AppContent 检测到 `selectedFile` 不为空
3. 渲染 CommitFileDiffView
4. CommitFileDiffView 从 diffStore 获取 FileDiff 数据
5. DiffView 渲染 hunks

## Technical Notes

- 使用 `n-split` 调整中间区域布局
- Diff 内容根据 `DiffLine` 类型渲染：
  - `Context`: 灰色背景
  - `Addition`: 绿色背景 + +
  - `Deletion`: 红色背景 + -
