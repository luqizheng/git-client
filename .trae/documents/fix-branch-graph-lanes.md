# 修复分支 Graph 路径显示问题

## 问题描述
当前不同 branch 的 commit 都显示在同一条线上（同一个 lane），没有正确区分不同分支的路径。

## 当前实现问题

`useCommitGraph.ts` 中的 lane 分配逻辑过于简单：
1. 每个新 commit 如果没有被分配 lane，就创建一个新的 lane
2. 没有考虑分支的合并和分叉关系
3. 没有复用 lane，导致所有 commit 都在不同 lane 上，或者错乱

## 正确算法设计

参考 GitKraken 和 SourceTree 的 Graph 渲染逻辑：

1. **Lane 复用原则**：
   - 主分支（HEAD 所在分支）使用 lane 0
   - 当创建新分支时，分配新的 lane
   - 当分支合并后，释放该 lane 供后续复用

2. **分支识别逻辑**：
   - 从 HEAD 开始遍历
   - 如果 commit 有多个 parent，说明是 merge commit
   - 如果 commit 被多个 child 指向，说明是分叉点

3. **Lane 分配策略**：
   ```
   Lane 0: 主分支（HEAD）
   Lane 1: 第一个特性分支
   Lane 2: 第二个特性分支
   ...
   ```

## 实现步骤

### 1. 重写 useCommitGraph.ts

使用更智能的 lane 分配算法：

```typescript
// 关键改进点：
// 1. 从 HEAD 开始反向遍历
// 2. 维护 lane 的占用状态
// 3. 分支合并时正确释放 lane
// 4. 分叉时分配新的 lane
```

### 2. 优化 GraphCell.vue

- 正确渲染跨多行的连接线
- 支持分支合并的曲线
- 支持分叉的曲线

### 3. 数据结构变更

需要为每个 commit 记录：
- 当前所在的 lane
- 入边（来自哪些 lane）
- 出边（去往哪些 lane）

## 具体算法

```
1. 构建 commit 索引映射
2. 找出所有分支点（一个 commit 有多个 child）
3. 找出所有合并点（一个 commit 有多个 parent）
4. 从 HEAD 开始反向遍历：
   - 如果当前 commit 是分支点：
     * 主分支继续占用当前 lane
     * 为其他分支分配新的 lane
   - 如果当前 commit 是合并点：
     * 选择主分支的 lane 继续
     * 释放被合并分支的 lane
   - 否则：
     * 继续在当前 lane
```

## 文件变更

1. `useCommitGraph.ts` - 重写核心算法
2. `GraphCell.vue` - 优化渲染逻辑
3. 可能需要调整 `CommitRow.vue` 接收更多 graph 信息

## 预期效果

```
Lane 0: ●────●────●────●────●  (main)
             ╲        ╱
Lane 1:      ●────●────●       (feature-1)
                  ╱
Lane 2:          ●────●        (feature-2)
```
