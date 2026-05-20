# Git 提交图动态布局设计

## 1. 概述

为 `GraphyCell.vue` 组件实现基于祖先关系的动态图布局，支持多分支在不同列显示，每条分支使用不同颜色，合并时使用直角连接线（禁止斜线）。

## 2. 核心算法

### 2.1 输入输出

**输入**：`Commit[]` - 按时间排序的提交数组

**输出**：
- 每个提交的位置（行索引、列索引）
- 每条连接线的颜色
- 直角路径段集合

### 2.2 布局算法步骤

1. **建立索引**：遍历提交列表，构建 `commitId → rowIndex` 映射
2. **分配列**：为每个提交分配列索引，确保：
   - 同一祖先链的提交尽量使用相同列
   - 分叉时分配新列
   - 合并时复用已有列
3. **着色**：为每条活跃线分配颜色
4. **计算路径**：生成所有连接线的直角路径段

### 2.3 着色策略

- 颜色池：使用 CSS 变量 `--branch-color-1` 到 `--branch-color-8`（8 个颜色）
- 新分支从颜色池顺序取色
- 合并后颜色可被消耗复用
- 确保无同色线在同列相交

## 3. 数据结构

```typescript
interface GraphNode {
  commitId: string
  rowIndex: number
  column: number
  color: string
}

interface PathSegment {
  type: 'vertical' | 'horizontal'
  x1: number
  y1: number
  x2: number
  y2: number
  color: string
}

interface Edge {
  fromRow: number
  fromCol: number
  toRow: number
  toCol: number
  color: string
  isMerge: boolean
}

interface GraphLayout {
  columns: number
  nodes: GraphNode[]
  segments: PathSegment[]
  edges: Edge[]
}
```

## 4. 连线规则

### 4.1 垂直线

主线从上到下，垂直绘制：
```
x = column * COLUMN_WIDTH + CENTER_X
y 从 rowIndex * ROW_HEIGHT 到 (rowIndex + 1) * ROW_HEIGHT
```

### 4.2 合并线（直角，禁止斜线）

**规则**：所有合并连接必须使用两段式直角路径

**合并到同一列**（右侧合并）：
```
从 (fromCol, rowIndex) 到 (toCol, rowIndex)
水平段：(fromCol*W, y) → (toCol*W, y)
垂直段：(toCol*W, y) → (toCol*W, y+H)
```

**合并到不同列**：
```
水平段：(fromCol*W, y) → (toCol*W, y)
垂直段：(toCol*W, y) → (toCol*W, y+H)
```

**示例图**：
```
     │                           │ (垂直)
     │                           │
     │         ──────────────────┼ (水平)
     │                           │
     ●───────────────────────────● (合并节点)
```

## 5. 组件改造

### 5.1 新增文件

**`src/utils/graphLayout.ts`**

核心布局算法：
- `computeGraphLayout(commits: Commit[]): GraphLayout`
- `assignColors(layout: GraphLayout): GraphLayout`
- `generatePathSegments(layout: GraphLayout): PathSegment[]`

### 5.2 修改文件

**`src/components/commit/components/cells/GraphyCell.vue`**

- 移除原有的嵌套 `g` 结构
- 使用 `computeGraphLayout` 计算布局
- 使用 `for` 循环渲染 `line` 元素
- 支持动态宽度（根据列数）

**`src/components/commit/components/commit-list/commit-list.vue`**

- 调整 GraphyCell 的容器样式

## 6. 常量定义

```typescript
const COLUMN_WIDTH = 20   // 每列宽度
const ROW_HEIGHT = 40     // 每行高度
const CENTER_X = 10      // 列中心 X 坐标
const CIRCLE_RADIUS = 8   // 节点圆半径
```

## 7. SVG 输出结构

```vue
<svg :width="layout.columns * COLUMN_WIDTH" :height="commits.length * ROW_HEIGHT">
  <!-- 垂直线段 -->
  <line
    v-for="seg in verticalSegments"
    :key="`v-${seg.x1}-${seg.y1}`"
    :x1="seg.x1" :y1="seg.y1" :x2="seg.x2" :y2="seg.y2"
    :stroke="seg.color"
    stroke-width="2"
  />

  <!-- 水平线段 -->
  <line
    v-for="seg in horizontalSegments"
    :key="`h-${seg.x1}-${seg.y1}`"
    :x1="seg.x1" :y1="seg.y1" :x2="seg.x2" :y2="seg.y2"
    :stroke="seg.color"
    stroke-width="2"
  />

  <!-- 节点圆圈 -->
  <circle
    v-for="node in nodes"
    :key="node.commitId"
    :cx="node.column * COLUMN_WIDTH + CENTER_X"
    :cy="node.rowIndex * ROW_HEIGHT + ROW_HEIGHT / 2"
    :r="CIRCLE_RADIUS"
    :fill="node.color"
    :stroke="node.color"
    stroke-width="2"
  />

  <!-- 引用光环 -->
  <circle
    v-for="node in nodesWithRefs"
    :key="`ref-${node.commitId}`"
    :cx="node.column * COLUMN_WIDTH + CENTER_X"
    :cy="node.rowIndex * ROW_HEIGHT + ROW_HEIGHT / 2"
    :r="CIRCLE_RADIUS + 2"
    fill="transparent"
    :stroke="'rgba(63, 185, 80, 0.5)'"
    stroke-width="2"
  />
</svg>
```

## 8. 边界情况

1. **空提交列表**：SVG 高度为 0，不渲染任何内容
2. **单提交无分支**：单列单节点，无连线
3. **多分支分叉**：分配新列，颜色递增
4. **多路合并**：每个父节点生成一条直角路径
5. **Octopus 合并**：支持 3+ 路合并

## 9. 性能考虑

- 使用 `computed` 缓存布局结果
- 仅在 `commits` 数组引用变化时重新计算
- 使用 `v-for` 的 `:key` 优化 Vue 渲染
