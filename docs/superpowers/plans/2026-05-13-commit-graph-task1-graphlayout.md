# Task 1: 增强 graphLayout.ts 算法

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** 在 LaneNode 接口添加 isMerge 字段，并修改 computeGraphLayout 函数检测合并提交。

**Architecture:** 修改现有的 `src/utils/graphLayout.ts`，保持向后兼容。isMerge 通过 `parent_ids.length >= 2` 判断。

**Tech Stack:** TypeScript

---

- [ ] **Step 1: 添加 isMerge 字段到 LaneNode**

修改 `src/utils/graphLayout.ts`，在 `LaneNode` 接口添加 `isMerge` 布尔字段：

```typescript
export interface LaneNode {
  commit: Commit
  lane: number
  y: number
  isMerge: boolean  // 新增：是否是合并提交
}
```

- [ ] **Step 2: 修改 computeGraphLayout 函数**

更新 `computeGraphLayout` 函数，在创建节点时检测合并提交。替换整个函数体：

```typescript
export function computeGraphLayout(commits: Commit[]): GraphLayout {
  const nodes: LaneNode[] = []
  const lines: LaneLine[] = []
  const commitLaneMap = new Map<string, number>()
  let nextLane = 0
  const rowHeight = 40

  for (let i = 0; i < commits.length; i++) {
    const commit = commits[i]
    let lane: number

    if (commitLaneMap.has(commit.id)) {
      lane = commitLaneMap.get(commit.id)!
    } else {
      lane = nextLane
      commitLaneMap.set(commit.id, lane)
      nextLane++
    }

    const isMerge = commit.parent_ids.length >= 2

    nodes.push({
      commit,
      lane,
      y: i * rowHeight,
      isMerge,
    })

    for (const parentId of commit.parent_ids) {
      if (!commitLaneMap.has(parentId)) {
        commitLaneMap.set(parentId, lane)
      } else {
        const parentLane = commitLaneMap.get(parentId)!
        if (parentLane !== lane) {
          lines.push({
            fromLane: lane,
            toLane: parentLane,
            fromY: i * rowHeight,
            toY: (i + 1) * rowHeight,
            color: getLaneColor(lane),
          })
        }
      }
    }

    if (commit.parent_ids.length === 0 || i < commits.length - 1) {
      const nextCommit = commits[i + 1]
      if (nextCommit && commit.parent_ids.includes(nextCommit.id)) {
        lines.push({
          fromLane: lane,
          toLane: commitLaneMap.get(nextCommit.id) ?? lane,
          fromY: i * rowHeight,
          toY: (i + 1) * rowHeight,
          color: getLaneColor(lane),
        })
      }
    }
  }

  return { nodes, lines, maxLane: nextLane }
}
```

- [ ] **Step 3: 运行测试验证**

Run:
```powershell
cd d:\projects\req2task-2\git-client
npx vitest run src/utils/__tests__/graphLayout.test.ts
```

Expected: PASS (原有测试应继续通过)

- [ ] **Step 4: Commit**

```bash
git add src/utils/graphLayout.ts
git commit -m "feat: add isMerge detection to graphLayout algorithm"
```
