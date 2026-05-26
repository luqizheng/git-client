## Why

当前 GraphyCell 的提交图布局算法（纯时间排序 + 两阶段启发式列分配）在 rebase/cherry-pick 场景下会产生非拓扑顺序，导致边向下绘制。同时缺少分支名称标签，无法像 GitKraken 一样直观识别分支拓扑。

## What Changes

### 算法重写（对齐 pvigier commit-graph-drawing-algorithms）

- **Temporal Topological Sort** 替代纯时间排序，保证所有场景下边始终向上
- **Straight Branches 列分配** 替代两阶段启发式，引入 branch child (parents[0]) / merge child 分类 + active branch 列表管理
- **固定 8 色调色板** 替代 HSL 随机生成，列回收后颜色复用

### 分支标签增强

- 在 GraphyCell 的提交节点旁渲染分支名称标签（Badge 样式）
- 标签颜色与分支对应列颜色一致
- 标签支持 local branch、remote branch、tag 三种引用类型的视觉区分
- 标签文字截断处理，防止长分支名撑破布局
- 左侧图区域自动扩展宽度以容纳标签

### 数据结构

- Rust backend: Commit 模型新增 `committer_time: i64`
- TypeScript: 前端类型同步新增 `committer_time`
- LayoutNode 接口: `hasRefs: boolean` 改为 `refs: CommitRef[]`
- GraphLayout 接口新增 `totalWidth`

## Capabilities

### Rewritten Capabilities

- `graph-layout-algorithm`: 提交图布局算法重写。含 Temporal Topological Sort、Straight Branches 列分配、固定 8 色调色板。

### New Capabilities

- `branch-graph-label`: 提交图上的分支名称标签渲染能力。含颜色映射、类型图标、文字截断、布局适配。

## Impact

- `src-tauri/src/models/commit.rs` — 新增 `committer_time: i64`
- `src-tauri/src/services/commit_service.rs` — 新增 `committer_time` 赋值
- `src/types/git.d.ts` — 新增 `committer_time: number`
- `src/mocks/commits.ts` — mock 数据增加 committer_time
- `src/utils/graphLayout.ts` — 核心算法重写（TTS + Straight Branches + 8色调色板），扩展 LayoutNode/GraphLayout 接口
- `src/components/commit/components/cells/GraphyCell.vue` — 分支标签渲染 + SVG 宽度自适应
- `src/components/commit/components/commit-list/commit-list.vue` — 图区域宽度自适应
- 8 个测试文件 — 增加 `committer_time` 字段