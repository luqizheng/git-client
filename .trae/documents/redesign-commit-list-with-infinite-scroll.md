# 重新设计 SourceTreeCommitList 组件

## 目标
对标 GitKraken 的提交列表，重新设计 `SourceTreeCommitList.vue`，并实现动态加载过往 commit 的功能。

## 当前问题分析

1. **布局问题**：
   - Graph 和 Branch 列分离，导致视觉不协调
   - 列宽计算复杂，sticky 定位有冲突
   - 滚动性能待优化

2. **缺少动态加载**：
   - 目前只加载固定数量的 commit
   - 没有实现无限滚动加载更多历史

3. **交互体验**：
   - 右键菜单功能不完整
   - 缺少加载状态提示

## 新设计方案

### 1. 布局重构

```
┌─────────────────────────────────────────────────────────────────────┐
│ [Toolbar]  Show All | Search | Filter                               │
├─────────────────────────────────────────────────────────────────────┤
│ GRAPH │ MESSAGE              │ AUTHOR        │ DATE        │ ACTIONS│
├───────┼──────────────────────┼───────────────┼─────────────┼────────┤
│ ●─╮   │ feat: add new feature│ John Doe      │ 2 hours ago │ ...    │
│ │ ●   │ fix: bug fix         │ Jane Smith    │ 5 hours ago │ ...    │
│ ●─╯   │ docs: update README  │ Bob Wilson    │ 1 day ago   │ ...    │
├───────┼──────────────────────┼───────────────┼─────────────┼────────┤
│ [Loading more...] 或 [Load more commits]                            │
└─────────────────────────────────────────────────────────────────────┘
```

### 2. 核心改进

#### A. 统一 Graph 渲染
- 将 Graph 线条和节点整合到 CommitRow 中
- 使用 SVG 内嵌到每行，而非全局 overlay
- 支持分支颜色自动分配

#### B. 无限滚动加载
- 监听滚动到底部事件
- 自动加载更多历史 commit
- 显示加载状态指示器

#### C. 虚拟滚动优化
- 保持现有虚拟滚动机制
- 优化滚动缓冲区计算
- 支持平滑滚动体验

### 3. 文件结构

```
src/components/commit/
├── SourceTreeCommitList.vue      # 主组件（重写）
├── composables/
│   ├── useResizableColumns.ts    # 列宽调整（保留）
│   ├── useVirtualScroll.ts       # 虚拟滚动（优化）
│   ├── useTimeGrouping.ts        # 时间分组（保留）
│   ├── useInfiniteScroll.ts      # 无限滚动（新增）
│   └── useCommitGraph.ts         # 提交图计算（优化）
└── components/
    ├── ColumnHeader.vue          # 列头（保留优化）
    ├── CommitRow.vue             # 提交行（重写）
    ├── TimeGroupHeader.vue       # 时间分组头（保留）
    ├── GraphCell.vue             # 图单元格（重写）
    ├── BranchTagCell.vue         # 分支标签（优化）
    ├── MessageCell.vue           # 消息单元格（优化）
    ├── AuthorCell.vue            # 作者单元格（优化）
    ├── DateCell.vue              # 日期单元格（优化）
    └── LoadingIndicator.vue      # 加载指示器（新增）
```

### 4. 数据流

```
User Scrolls → detect scroll near bottom
                    ↓
         trigger loadMoreCommits()
                    ↓
         commitsStore.fetchLogs(repoPath, limit, lastCommitId)
                    ↓
         Rust backend: get_log with pagination
                    ↓
         Append new commits to list
                    ↓
         Recompute graph layout
                    ↓
         Update virtual scroll items
```

### 5. 后端接口调整

现有的 `get_log` 已支持分页参数：
```rust
pub async fn get_log(
    repo_path: String,
    limit: u32,
    after: Option<String>,  // 最后一条 commit id
) -> Result<Vec<Commit>, AppError>
```

### 6. 实现步骤

#### Phase 1: 基础组件重构
1. 重写 `SourceTreeCommitList.vue` 主组件结构
2. 优化 `useVirtualScroll.ts` 支持动态内容高度
3. 创建 `useInfiniteScroll.ts` 组合式函数

#### Phase 2: Graph 渲染优化
1. 重写 `GraphCell.vue` 将 SVG 整合到行内
2. 优化 `useCommitGraph.ts` 支持增量计算
3. 移除全局 `GraphOverlay.vue`

#### Phase 3: 子组件优化
1. 优化 `CommitRow.vue` 简化 props 传递
2. 优化各 Cell 组件样式
3. 创建 `LoadingIndicator.vue`

#### Phase 4: 状态管理增强
1. 更新 `commits.ts` store 支持分页加载
2. 优化加载状态管理
3. 添加错误重试机制

#### Phase 5: 测试验证
1. 验证虚拟滚动性能
2. 验证无限滚动加载
3. 验证 Graph 渲染正确性

### 7. 关键代码变更

#### useInfiniteScroll.ts (新增)
```typescript
export function useInfiniteScroll(
  containerRef: Ref<HTMLElement | null>,
  options: {
    threshold?: number
    onLoadMore: () => Promise<void>
    hasMore: Ref<boolean>
    loading: Ref<boolean>
  }
) {
  // 监听滚动，接近底部时触发加载
}
```

#### CommitRow.vue (重写)
```vue
<template>
  <div class="commit-row" :style="{ transform: `translateY(${offset}px)` }">
    <div class="graph-col">
      <InlineGraph :commit="commit" :layout="graphLayout" />
    </div>
    <div class="content-cols">
      <!-- message, author, date -->
    </div>
  </div>
</template>
```

### 8. 样式规范

- 行高：40px
- Graph 列宽：动态计算（基于最大分支数）
- 字体：系统默认等宽字体
- 颜色：继承主题 CSS 变量
- 动画：过渡时间 150ms

### 9. 性能目标

- 首屏渲染 < 100ms（50 条 commit）
- 滚动帧率 > 60fps
- 加载更多无感知延迟
- 内存占用稳定（虚拟滚动）
