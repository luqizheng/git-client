# CommitList 重写设计 — 使用 @gitgraph/js

> 日期: 2026-05-14
> 状态: 待实施
> 决策: 方案 A — GitGraph 全量渲染 + 绝对定位虚拟行

## 1. 目标

删除现有 `SourceTreeCommitList.vue` 和 `CommitList.vue`，使用 `@gitgraph/js`（已安装 v1.4.0）重新实现 commit 列表组件。采用左右分栏布局：左侧 gitgraph.js 渲染分支图，右侧显示 commit 信息列。

## 2. 需求

- 布局: 左右分栏（graph + 信息列）
- Graph: @gitgraph/js 全托管渲染（SVG Arrow 模板）
- 功能保留: 搜索过滤、虚拟滚动、右键菜单、可调列宽
- 行高: 固定 40px

## 3. 架构

```
┌─────────────────────────────────────────────────────────┐
│  Toolbar: [搜索] [过滤 ▼] [分支筛选 ×]                   │
├────────────┬────────────────────────────────────────────┤
│            │  ColumnHeader (可拖拽)                       │
│ GitGraph   ├──────┬──────┬───────┬────────┤             │
│ SVG 区域   │Branch│Msg   │Author  │ Date   │ 虚拟行       │
│ (全量)     │      │      │        │        │ 绝对定位     │
│ ~200px宽   │ Row0 │ row0 │ row0   │ row0   │ y=0*40      │
│            │ Row1 │ row1 │ row1   │ row1   │ y=1*40      │
│            │ ...  │ ...  │ ...    │ ...    │ 仅可见       │
└────────────┴──────┴──────┴───────┴────────┴─────────────┘
                    共享滚动容器（overflow-y: auto）
```

**核心策略**: gitgraph 渲染完整 graph 到左侧 SVG 区域；右侧 commit 行用虚拟滚动 + 绝对定位，Y 坐标与 graph 节点对齐；同一容器滚动，两者天然同步。

## 4. 文件变更

### 删除（5 个）

| 文件 | 原因 |
|---|---|
| `components/commit/SourceTreeCommitList.vue` | 被新组件替代 |
| `components/commit/CommitList.vue` | 未使用的旧版本 |
| `components/graph/GraphColumn.vue` | 被 gitgraph.js 替代 |
| `utils/graphLayout.ts` | 手写布局算法不再需要 |
| `components/commit/composables/useCommitGraph.ts` | 仅被上述组件使用 |

### 修改（1 个）

- `App.vue`: import 从 `SourceTreeCommitList` 改为 `CommitList`

### 新建（1 个）

- `components/commit/CommitList.vue` — 全新组件

### 保留不动

- `composables/useVirtualScroll.ts`
- `composables/useInfiniteScroll.ts`
- `composables/useResizableColumns.ts`
- `components/commit/components/ColumnHeader.vue`
- 所有 stores、类型定义

## 5. GitGraph 集成

### 配置

```typescript
import { Gitgraph, TemplateName, Orientation, Mode } from '@gitgraph/js'

const gitgraph = new Gitgraph(containerEl, {
  template: TemplateName.SVGArrow,
  orientation: Orientation.VerticalReverse,
  mode: Mode.Compact,
})
```

- **SVG Arrow**: 输出 SVG 元素，便于 DOM 叠加和样式定制
- **VerticalReverse**: 最新 commit 在顶部
- **Compact**: 紧凑模式减少行高

### 数据适配

@gitgraph/js 是命令式 API (`git.branch().commit()`)，需要将声明式的 `Commit[]` 适配：

```typescript
function renderCommitsToGitgraph(
  gitgraph: Gitgraph,
  commits: Commit[]
): Map<string, number>
```

逻辑：
1. 遍历 commits（时间倒序，HEAD 在前）
2. 用 parent_ids 追踪分支关系
3. 调用 gitgraph api 的 commit / branch / merge 方法
4. 渲染后遍历 SVG DOM 提取每个 commit 节点的 Y 坐标
5. 返回 Map<commitId, yPosition>

### Y 坐标提取

@gitgraph.js v1.4 SVG 模式在 commit 节点生成带 `data-commit-hash` 的 `<g>` 元素：
- 通过 `querySelectorAll('[data-commit-hash]')` 获取位置
- 或从内部 render 事件/钩子读取

## 6. 组件结构

### Template

```
CommitList.vue
├── .toolbar          — 搜索框 + 过滤选择 + 分支筛选标签
├── .body (ref=scrollContainer, @scroll)
│   ├── .graph-layer  — 左侧固定宽度 ~200px
│   │   └── #gitgraphEl — @gitgraph/js 挂载点
│   ├── .rows-layer   — 右侧虚拟行容器 (height: totalHeight)
│   │   └── .commit-row (v-for visibleItems, absolute, translateY)
│   │       ├── BranchCol   — branch/tag 标签
│   │       ├── MessageCol  — commit message
│   │       ├── AuthorCol   — author name
│   │       └── DateCol     — relative time
│   └── #loadMoreSentinel   — 无限滚动触发点
└── NDropdown           — 右键菜单
```

### Script 核心逻辑

```typescript
// 状态
const gitgraph = ref<Gitgraph | null>(null)
const gitgraphEl = ref<HTMLElement | null>(null)
const commitYMap = ref(new Map<string, number>()) // commitId -> Y坐标
const scrollContainer = ref<HTMLElement | null>(null)

// 虚拟滚动
const { totalHeight, visibleItems, handleScroll } = useVirtualScroll(
  scrollContainer,
  computed(() => createVirtualItems(displayCommits.value))
)

// GitGraph 渲染
async function renderGraph(commits: Commit[]) {
  // 清空旧实例
  // 创建新 Gitgraph 实例
  // 适配数据并渲染
  // 提取 Y 坐标映射
}

// 数据变化时重渲染
watch(displayCommits, (commits) => renderGraph(commits), { deep: false })
```

## 7. 功能模块

### 搜索过滤
- 复用现有 repo store 的 searchQuery / searchFilter / searchResults
- 300ms debounce
- 搜索模式切换 displayCommits → searchResults，触发 graph 重渲染

### 右键菜单
选项：Cherry-pick / Rebase / Reset(Soft/Mixed/Hard) / Create Branch / Tag / Copy SHA
与现有一致

### 可调列宽
复用 useResizableColumns + ColumnHeader.vue
列定义: Branch(120) | Message(flex) | Author(120) | Date(100)

### 分支筛选
点击 branch tag → filterByBranch
显示当前筛选 branch name，可清除

### 选中状态
点击行/节点 → 高亮 + 同步到 store

### Graph 交互
- 点击节点 ≈ 点击行
- Hover 节点 → tooltip(SHA, author, time)
- 点击 branch label → 分支筛选

## 8. 性能考量

- gitgraph SVG 全量渲染: ~500 commits 约 5000-10000 SVG 节点，浏览器可轻松处理
- DOM 行始终只渲染可见的 ~20-30 行
- >2000 commits 时考虑分帧渲染（Phase 2）
- 增量加载（无限滚动）需 full re-render（gitgraph 不支持增量更新）

## 9. 边界情况

| 场景 | 处理 |
|---|---|
| 空仓库 / 0 commit | 显示空状态提示 |
| 搜索无结果 | 显示 "No results" + graph 清空 |
| 增量加载新 commit | 销毁旧实例，全量重新渲染 |
| 主题切换 | 重新创建 gitgraph 实例（应用新颜色） |
| 大量 commit (>2000) | loading 状态 + requestIdleCallback 分帧 |

## 10. 实施顺序

1. 安装确认 @gitgraph/js 依赖
2. 编写数据适配函数（Commit[] → gitgraph API）
3. 实现 CommitList.vue 基础结构（toolbar + graph 区域 + rows）
4. 接入虚拟滚动
5. 接入搜索过滤
6. 接入右键菜单
7. 接入可调列宽
8. 删除旧文件 + 更新 App.vue
9. 测试 + 主题适配
