## Context

当前 `computeGraphLayout` 的排序是 `commits.sort((a,b) => a.time - b.time)`（纯 author date 排序），列分配是两阶段启发式（先朴素继承父列、再用 `lastCommitInColumn` 冲突检查向右偏移）。该方案在 rebase/cherry-pick/跨时区协作场景下会：

1. 产生非拓扑顺序 → 边向下绘制
2. 分支列偏移 → 分叉不直、视觉混乱
3. 颜色重复 → 同列不同色

参考论文：https://pvigier.github.io/2019/05/06/commit-graph-drawing-algorithms.html

## Goals / Non-Goals

**Goals:**
- 提交图布局算法完全对齐 pvigier 方案（Temporal Topological Sort + Straight Branches + 固定调色板）
- 提交节点右侧渲染分支名称 Badge
- Badge 颜色与分支列颜色一致
- 区分 local branch / remote branch / tag 三种类型
- 长分支名截断显示
- 图区域宽度自适应标签宽度

**Non-Goals:**
- 不做 curved branches（过度工程，性能开销大）
- 不变更右侧 BranchTagCell 的行为

## Decisions

### 1. 数据结构扩展

#### 后端：Commit 模型新增 committer_time

```rs
// src-tauri/src/models/commit.rs
pub struct Commit {
    pub id: String,
    pub message: String,
    pub author: String,
    pub author_email: String,
    pub time: i64,              // author date（显示用，不动）
    pub committer_time: i64,    // committer date（拓扑排序用，新增）
    pub parent_ids: Vec<String>,
    pub refs: Vec<CommitRef>,
}
```

```rs
// commit_service.rs 赋值
committer_time: c.committer().when().seconds(),
```

#### 前端：类型同步

```ts
// src/types/git.d.ts
export interface Commit {
  id: string
  message: string
  author: string
  author_email: string
  time: number
  committer_time: number    // 新增
  parent_ids: string[]
  refs: CommitRef[]
}
```

#### LayoutNode 接口扩展

```ts
// 原
interface LayoutNode {
  commitId: string; rowIndex: number; column: number; color: string; hasRefs: boolean;
}
// 新
interface LayoutNode {
  commitId: string; rowIndex: number; column: number; color: string; refs: CommitRef[];
}
```

#### GraphLayout 接口扩展

```ts
// 原
interface GraphLayout { nodes: LayoutNode[]; segments: LayoutSegment[]; columns: number; }
// 新
interface GraphLayout { nodes: LayoutNode[]; segments: LayoutSegment[]; columns: number; totalWidth: number; }
```

### 2. Temporal Topological Sort

排序策略从纯时间排序改为 pvigier 的 Temporal Topological Sort：

```
Input:  commits 数组（每条包含 commit_time、committer_time、parent_ids）
Output: 每个 commit 的 rowIndex（0 = 最顶部/最新）

步骤:
1. 从 parent_ids 构建 children 索引: Map<commitId, Commit[]>
2. 按 committer_time 降序排列（最新优先）
3. DFS 遍历，后序赋 rowIndex:
   for each c in sorted (newest first):
     if not visited: dfs(c)
   
   dfs(c):
     if visited.has(c.id): return
     visited.add(c.id)
     for each child in c.children: dfs(child)
     c.rowIndex = i++   // 后序: 子节点先赋值（高 rowIndex=远离顶部=更旧）
```

结果保证：始终满足 `parent.rowIndex > child.rowIndex`（边始终向上）。

边界情况：
- **孤立提交（无 parent_ids）**：DFS 直接赋值，按 committer_time 决定相对顺序
- **多个 root（多个无父提交的初始提交）**：按 committer_time 排序，较旧的先处理（高 rowIndex）
- **环形引用**：DFS visited 避免重复访问（实际不会发生，但防御性处理）

### 3. Straight Branches 列分配

替代当前的两阶段启发式。核心思想：基于 `parents[0]`（第一个父提交 = 主干分支）区分 branch child 和 merge child。

```ts
// 核心概念
// branch child:  d.parents[0] == c  → c 的分支由 d 延续
// merge child:   d.parents[0] != c  → c 被 d 合并进来，分支结束
```

```
activeBranches: {commitId: string, column: number}[]

for each commit in commits sorted by rowIndex ASC (newest first, top to bottom):
  // c 可能已被 branch child 占据了列
  branchChildren = children where child.parents[0] == c.id
  mergeChildren = children where child.parents[0] != c.id

  if branchChildren.length > 0:
    // 选最左的 branch child 继承其列
    // 这个 child 是主干延续
    selected = pickMinColumn(branchChildren)
    c.column = selected.column
    activeBranches[c.column].commitId = c.id  // replace
  else:
    // 分支终点或初始提交
    // 从 activeBranches 中移除 c（如果有）
    // 分配新列到最右
    c.column = activeBranches.length
    activeBranches.push({commitId: c.id, column: c.column})

  // 从 activeBranches 移除 mergeChildren
  // merge 进来的分支不再活跃
  for each child in mergeChildren:
    activeBranches = remove(activeBranches, child)
```

结果：同一分支的所有提交在同一列，视觉上笔直。

边界情况：
- **合并提交有两个父提交在不同列**：取 branch child（parents[0] 的列），merge child 列不作为主列
- **octopus merge（3+ 父提交）**：parents[0] 为主干，其余视为 merge child
- **空列回收**：当 active branch 结束（被 merge 或自然终结），activeBranches 列表收缩

### 4. 固定 8 色调色板

列编号映射到固定调色板，取代当前 HSL 随机生成。

```ts
// palette: HSL 值
const PALETTE = [
  'hsl(0, 70%, 55%)',     // 红
  'hsl(210, 70%, 55%)',   // 蓝
  'hsl(145, 70%, 45%)',   // 绿
  'hsl(35, 85%, 55%)',    // 橙
  'hsl(280, 60%, 60%)',   // 紫
  'hsl(175, 70%, 45%)',   // 青
  'hsl(16, 75%, 55%)',    // 橙红
  'hsl(220, 60%, 50%)',   // 深蓝
]

function getColor(column: number): string {
  return PALETTE[column % PALETTE.length]
}
```

列回收（active branch 结束 → 列号收缩 → 新分支复用旧颜色）。

### 5. 标签渲染方式：HTML overlay 替代 SVG text

与之前方案一致。SVG `<text>` 不支持自动换行、CSS `text-overflow: ellipsis` 等。采用绝对定位的 HTML 元素叠加在 SVG 上方。

### 6. 标签定位

```
[circle] [8px gap] [badge1] [4px] [badge2] ...
```

标签左边缘 = `node.column * COLUMN_WIDTH + CIRCLE_RADIUS + 8`。
标签垂直居中于行（top = rowIndex * 32 + 6）。

### 7. 图宽度自适应

```ts
totalWidth = columns * COLUMN_WIDTH + maxOverflowPerRow
```

`maxOverflowPerRow` = 每行标签总宽度的最大值。无标签时为 0。

父组件 `commit-list.vue` 用 `totalWidth` 替代 `columns * COLUMN_WIDTH` 计算图区域初始宽度。

### 8. 截断规则

- 单标签最大宽 140px，超出用 `text-overflow: ellipsis`
- 最多显示 3 个标签，超出显示 `+N`
- remote branch 名称去掉 `origin/` 前缀（hover 显示全名）

### 9. 类型视觉区分

| 类型 | 样式 |
|------|------|
| local branch | 实色背景 + 白色文字 + 圆角 4px |
| remote branch | 透明背景 + 同色边框 + 同色文字 |
| tag | 透明背景 + 虚线边框 + 菱形图标 |

## Risks / Trade-offs

- **图区域宽度变大** → 默认 56px 可能不够，标签会使图区变宽。通过 `totalWidth` 自适应缓解。
- **性能** → 每行增加 HTML 元素渲染，标签仅在节点行渲染，开销可控。算法复杂度从 O(n) 近似升为 O(n log n)（DFS 排序），但 n=提交数通常 < 10000，不影响。
- **activeBranches 列收缩** → 可能引起列号跳跃。pvigier 也使用连续列方案（无空洞），列号变化不影响布局正确性。
- **行高不一致** → 当前 `ROW_HEIGHT=32` 但右侧行高 40px。标签行高 20px 在 32px 行内可居中，暂不修。
- **committer_time 数据完整性** → 旧仓库可能某些提交 committer_time 缺失或不准确。TTS 降级处理：committer_time 相同时按 author_time 排序。