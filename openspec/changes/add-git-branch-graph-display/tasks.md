## 1. 数据结构变更

- [x] 1.1 Rust model: Commit 新增 committer_time 字段
- [x] 1.2 Rust service: commit_service.rs 提取 committer date 赋值
- [x] 1.3 TS types: git.d.ts 新增 committer_time
- [x] 1.4 TS mock: commits.ts 增加 committer_time 字段
- [x] 1.5 测试文件: 无需改动（前端无直接构造 Commit 的测试文件）

## 2. 核心算法重写（graphLayout.ts）

- [x] 2.1 LayoutNode 接口: hasRefs → refs: CommitRef[]
- [x] 2.2 GraphLayout 接口: 新增 totalWidth 字段
- [x] 2.3 实现 children 索引构建（从 parent_ids 反向索引）
- [x] 2.4 实现 Temporal Topological Sort（DFS 后序赋 rowIndex）
- [x] 2.5 实现 Straight Branches 列分配（active branch 列表 + branch/merge child 区分）
- [x] 2.6 实现固定 8 色调色板（getColor 函数）
- [x] 2.7 重构 computeGraphLayout 入口（整合 TTS + Straight Branches + 线段生成 + totalWidth 计算）
- [x] 2.8 重构线段生成逻辑（支持双父提交双入线）
- [x] 2.9 移除旧代码（纯时间排序、两阶段启发式、HSL 随机颜色）

## 3. 图宽度自适应

- [x] 3.1 GraphyCell SVG 改用 layout.totalWidth 替代 layout.columns * COLUMN_WIDTH
- [x] 3.2 commit-list.vue 图区域宽度监听 totalWidth 变化
- [x] 3.3 图区域 overflow visible，允许标签溢出显示

## 4. 分支标签渲染

- [x] 4.1 在 GraphyCell.vue 中为有 refs 的行渲染 HTML overlay 标签容器
- [x] 4.2 标签 Badge 按 ref_type 区分样式：local（实色背景）、remote（边框）、tag（虚线边框）
- [x] 4.3 标签颜色与 LayoutNode.color 同步
- [x] 4.4 最多显示 3 个标签，超出显示 `+N`
- [x] 4.5 单标签最大宽 140px，超出截断 + ellipsis + title 属性显示完整名
- [x] 4.6 remote branch 名称去掉 `origin/` 前缀（显示层处理）

## 5. 验证

- [ ] 5.1 在含多分支的仓库中验证拓扑排序正确（无向下边）
- [ ] 5.2 验证 Straight Branches 列分配：同分支同列，分叉新列
- [ ] 5.3 验证 8 色调色板视觉效果
- [ ] 5.4 验证标签显示正确
- [ ] 5.5 验证长分支名截断效果
- [ ] 5.6 验证 3 种 ref_type 样式区分
- [ ] 5.7 验证无 refs 的提交行不受影响（回归检查）