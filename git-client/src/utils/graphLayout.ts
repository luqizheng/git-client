// utils/graphLayout.ts

export const COLUMN_WIDTH = 60
export const ROW_HEIGHT = 32
export const CENTER_X = COLUMN_WIDTH / 2
export const CIRCLE_RADIUS = 10

export interface LayoutNode {
  commitId: string
  rowIndex: number    // 0 表示最旧，越大越新
  column: number      // 0,1,2...
  color: string       // 分支颜色
  hasRefs: boolean
}

export interface LayoutSegment {
  type: 'vertical' | 'horizontal'
  x1: number
  y1: number
  x2: number
  y2: number
  color: string
}

export interface GraphLayout {
  columns: number
  nodes: LayoutNode[]
  segments: LayoutSegment[]
}

// 生成一个简单的哈希色
function getBranchColor(column: number): string {
  const hue = (column * 137) % 360
  return `hsl(${hue}, 70%, 55%)`
}

export function computeGraphLayout(commits: Commit[]): GraphLayout {
  // commits 必须是从旧到新排序（最旧在前，最新在后）
  const rows = commits.length

  // 1. 为每个 commit 分配列 (lane)
  const commitToColumn = new Map<string, number>()
  const columnOccupancy: Map<number, string[]> = new Map() // 记录每列已被哪些 commitId 占用（用于检测冲突）

  // 辅助：找到某列当前是否被特定行（rowIndex）占用？实际上列分配是在处理每个 commit 时动态决定，
  // 因为列只在不同分支间共享，同一行只有一个 commit，所以不需要按行检查冲突，只需确保同一个父提交的多个子提交不会抢同一列。
  // 简化：我们只保证在同一时间（处理顺序），如果父提交的列可用，就复用；否则找最小未使用的列。

  for (let i = 0; i < commits.length; i++) {
    const commit = commits[i]
    const parentIds = commit.parent_ids

    // 情况1：第一个提交（最旧的）-> 分配列 0
    if (i === 0) {
      commitToColumn.set(commit.id, 0)
      continue
    }

    // 情况2：普通提交（通常只有一个父提交）
    if (parentIds.length === 1) {
      const parentId = parentIds[0]
      const parentColumn = commitToColumn.get(parentId)

      if (parentColumn !== undefined) {
        // 尝试复用父提交的列
        let assignedColumn = parentColumn
        // 检查该列是否已经被当前行的兄弟提交占用？实际上在同一行不会有多个提交，但为了确保合并场景，我们还需要检查该列是否已被其他提交占用导致连接受阻？
        // 简化：只有合并提交才需要特殊处理，单父提交直接复用父列即可。
        commitToColumn.set(commit.id, assignedColumn)
      } else {
        // 父提交未分配（理论上不会发生，因为我们是按时间旧->新处理）
        commitToColumn.set(commit.id, 0)
      }
    }
    // 情况3：合并提交（两个父提交）
    else if (parentIds.length >= 2) {
      // 获取两个父提交的列
      const parentCols = parentIds
        .map(pid => commitToColumn.get(pid))
        .filter((c): c is number => c !== undefined)

      if (parentCols.length === 0) {
        commitToColumn.set(commit.id, 0)
        continue
      }

      // 合并提交应优先选择两个父列中较小的列（使主分支连贯）
      let chosenCol = Math.min(...parentCols)

      // 但需要确保该列不会与当前已分配给其他提交的列冲突（实际上同一行只有一个提交，无冲突）
      // 然而，为了后续连线不重叠，有时需要向右偏移。更精确的做法是检查该列是否已被“活跃”占用（即该列最底部的提交是否还在分支线上）。
      // 为了简洁，我们直接使用较小列。
      commitToColumn.set(commit.id, chosenCol)
    }
    // 情况4：无父提交（初始提交）-> 列0
    else {
      commitToColumn.set(commit.id, 0)
    }
  }

  // 经过第一轮分配，有可能某些相邻提交使用了相同列，这是正确的（同分支）。
  // 但还需要处理一种情况：当两个不同分支的提交被分配到同一列，且它们之间没有继承关系，连线会出现交叉。
  // 更完善的算法需要“列重分配”或“冲突解决”。为了快速修复你的问题，我们在此加一个后处理：
  // 如果某个提交的列与其父提交的列相同，但父提交还有其他子提交也使用该列，则不需要调整。
  // 实际上标准的 Git 图算法会维护每个列的“最近提交”，如果新提交要使用的列最近不是由其父提交占据，则向右偏移。

  // 我们改进一下：使用“每列的最后提交”映射
  const lastCommitInColumn = new Map<number, string>()

  for (let i = 0; i < commits.length; i++) {
    const commit = commits[i]
    const parentIds = commit.parent_ids
    let preferredCol = commitToColumn.get(commit.id) ?? 0

    // 检查首选列是否可用：如果该列上一次出现的提交不是当前提交的任何一个父提交，则说明需要向右寻找新列
    const lastCommitId = lastCommitInColumn.get(preferredCol)
    if (lastCommitId && !parentIds.includes(lastCommitId)) {
      // 需要向右找到第一个空闲列（即该列的上次提交是当前提交的父提交之一才允许复用）
      let newCol = preferredCol + 1
      while (lastCommitInColumn.has(newCol)) {
        const lastInNewCol = lastCommitInColumn.get(newCol)!
        if (parentIds.includes(lastInNewCol)) {
          // 这个新列的上次提交是当前提交的父提交，可以使用
          break
        }
        newCol++
      }
      preferredCol = newCol
      // 更新映射
      commitToColumn.set(commit.id, preferredCol)
    }
    // 更新该列的最后提交
    lastCommitInColumn.set(preferredCol, commit.id)
  }

  // 计算总列数
  const columns = Math.max(...Array.from(commitToColumn.values()), 0) + 1

  // 构建 nodes 数组（行索引 = 在排序数组中的位置，0=最旧）
  const nodes: LayoutNode[] = commits.map((commit, idx) => ({
    commitId: commit.id,
    rowIndex: idx,
    column: commitToColumn.get(commit.id)!,
    color: getBranchColor(commitToColumn.get(commit.id)!),
    hasRefs: commit.refs && commit.refs.length > 0
  }))

  // 生成连线 segments（垂直 + 水平）
  const segments: LayoutSegment[] = []

  // 先建立 commitId -> rowIndex 的映射
  const idToRow = new Map<string, number>()
  commits.forEach((c, idx) => idToRow.set(c.id, idx))

  for (const commit of commits) {
    const fromRow = idToRow.get(commit.id)!
    const fromCol = commitToColumn.get(commit.id)!
    const fromX = fromCol * COLUMN_WIDTH + CENTER_X
    const fromY = fromRow * ROW_HEIGHT + ROW_HEIGHT / 2

    // 遍历每个父提交
    for (const parentId of commit.parent_ids) {
      const toRow = idToRow.get(parentId)
      if (toRow === undefined) continue // 理论上存在

      const toCol = commitToColumn.get(parentId)!
      const toX = toCol * COLUMN_WIDTH + CENTER_X
      const toY = toRow * ROW_HEIGHT + ROW_HEIGHT / 2

      const color = getBranchColor(Math.max(fromCol, toCol))

      if (fromCol === toCol) {
        // 同一列：垂直连线
        segments.push({
          type: 'vertical',
          x1: fromX,
          y1: fromY,
          x2: toX,
          y2: toY,
          color
        })
      } else {
        // 不同列：水平 + 垂直
        const midY = fromY // 水平连线在同一行高度
        segments.push({
          type: 'horizontal',
          x1: fromX,
          y1: fromY,
          x2: toX,
          y2: fromY,
          color
        })
        segments.push({
          type: 'vertical',
          x1: toX,
          y1: fromY,
          x2: toX,
          y2: toY,
          color
        })
      }
    }
  }

  // 去重 segments（可能重复添加同一线段，简单去重）
  const uniqueSegments = segments.filter((seg, idx, self) =>
    self.findIndex(s => s.x1 === seg.x1 && s.y1 === seg.y1 && s.x2 === seg.x2 && s.y2 === seg.y2) === idx
  )

  return {
    columns,
    nodes,
    segments: uniqueSegments
  }
}