import type { Commit, CommitRef } from '../types/git'

export const COLUMN_WIDTH = 60
export const ROW_HEIGHT = 32
export const CENTER_X = COLUMN_WIDTH / 2
export const CIRCLE_RADIUS = 10
const LABEL_GAP = 8
const LABEL_BETWEEN_GAP = 4
const MAX_LABEL_WIDTH = 140
const PALETTE_MAX_DISPLAY = 3

const PALETTE = [
  'hsl(0, 70%, 55%)',
  'hsl(210, 70%, 55%)',
  'hsl(145, 70%, 45%)',
  'hsl(35, 85%, 55%)',
  'hsl(280, 60%, 60%)',
  'hsl(175, 70%, 45%)',
  'hsl(16, 75%, 55%)',
  'hsl(220, 60%, 50%)',
]

export interface LayoutNode {
  commitId: string
  rowIndex: number
  column: number
  color: string
  refs: CommitRef[]
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
  totalWidth: number
}

function getColor(column: number): string {
  return PALETTE[column % PALETTE.length]
}

function estimateLabelWidth(name: string): number {
  return Math.min(name.length * 8 + 16, MAX_LABEL_WIDTH)
}

function estimateNodeLabelOverflow(node: LayoutNode): number {
  if (!node.refs || node.refs.length === 0) return 0
  const visible = node.refs.slice(0, PALETTE_MAX_DISPLAY)
  let total = LABEL_GAP
  for (let i = 0; i < visible.length; i++) {
    total += estimateLabelWidth(visible[i].name)
    if (i < visible.length - 1) total += LABEL_BETWEEN_GAP
  }
  if (node.refs.length > PALETTE_MAX_DISPLAY) total += 24
  return total
}

function computeTotalWidth(columns: number, nodes: LayoutNode[]): number {
  const baseWidth = columns * COLUMN_WIDTH
  let maxOverflow = 0
  for (const node of nodes) {
    if (node.refs.length === 0) continue
    const circleRight = node.column * COLUMN_WIDTH + CENTER_X + CIRCLE_RADIUS
    const overflow = circleRight + estimateNodeLabelOverflow(node) - baseWidth
    if (overflow > maxOverflow) maxOverflow = overflow
  }
  return baseWidth + maxOverflow
}

export function computeGraphLayout(commits: Commit[]): GraphLayout {
  if (commits.length === 0) {
    return { columns: 0, nodes: [], segments: [], totalWidth: 0 }
  }

  const commitMap = new Map<string, Commit>()
  for (const c of commits) {
    commitMap.set(c.id, c)
  }

  const childrenMap = new Map<string, string[]>()
  for (const c of commits) {
    childrenMap.set(c.id, [])
  }
  for (const c of commits) {
    for (const pid of c.parent_ids) {
      if (childrenMap.has(pid)) {
        childrenMap.get(pid)!.push(c.id)
      }
    }
  }

  const rowIndexMap = new Map<string, number>()
  let rowCounter = 0
  const visited = new Set<string>()

  const sortedByTime = [...commits].sort((a, b) => b.committer_time - a.committer_time)

  function dfs(commitId: string): void {
    if (visited.has(commitId)) return
    visited.add(commitId)

    const children = childrenMap.get(commitId) ?? []
    for (const childId of children) {
      dfs(childId)
    }

    rowIndexMap.set(commitId, rowCounter++)
  }

  for (const c of sortedByTime) {
    if (!visited.has(c.id)) {
      dfs(c.id)
    }
  }

  const rows = commits.length
  const activeBranches: (string | null)[] = []

  for (let r = 0; r < rows; r++) {
    const commitAtRow = commits.find(c => rowIndexMap.get(c.id) === r)
    if (!commitAtRow) continue

    const commit = commitAtRow
    const children = childrenMap.get(commit.id) ?? []

    const branchChildren = children.filter(cid => {
      const child = commitMap.get(cid)
      return child && child.parent_ids.length > 0 && child.parent_ids[0] === commit.id
    })

    const mergeChildren = children.filter(cid => !branchChildren.includes(cid))

    let col: number
    if (branchChildren.length > 0) {
      const selectedChild = branchChildren
        .map(cid => ({ id: cid, col: activeBranches.indexOf(cid) }))
        .filter(x => x.col >= 0)
        .sort((a, b) => a.col - b.col)[0]
      if (selectedChild) {
        col = selectedChild.col
        activeBranches[col] = commit.id
      } else {
        col = activeBranches.length
        activeBranches.push(commit.id)
      }
    } else {
      col = activeBranches.length
      activeBranches.push(commit.id)
    }

    for (const childId of mergeChildren) {
      const childCol = activeBranches.indexOf(childId)
      if (childCol >= 0) {
        activeBranches[childCol] = null
      }
    }
  }

  const commitToColumn = new Map<string, number>()
  for (let r = 0; r < rows; r++) {
    const commit = commits.find(c => rowIndexMap.get(c.id) === r)
    if (!commit) continue

    const children = childrenMap.get(commit.id) ?? []
    const branchChildren = children.filter(cid => {
      const child = commitMap.get(cid)
      return child && child.parent_ids.length > 0 && child.parent_ids[0] === commit.id
    })

    if (branchChildren.length > 0) {
      const selectedChild = branchChildren
        .map(cid => ({ id: cid, col: activeBranches.indexOf(cid) }))
        .filter(x => x.col >= 0)
        .sort((a, b) => a.col - b.col)[0]
      if (selectedChild) {
        commitToColumn.set(commit.id, selectedChild.col)
        continue
      }
    }

    let col = activeBranches.indexOf(commit.id)
    if (col < 0) {
      col = activeBranches.findIndex(x => x === null)
      if (col < 0) col = activeBranches.length
    }
    commitToColumn.set(commit.id, col)
  }

  const nodes: LayoutNode[] = commits.map(c => ({
    commitId: c.id,
    rowIndex: rowIndexMap.get(c.id) ?? 0,
    column: commitToColumn.get(c.id) ?? 0,
    color: getColor(commitToColumn.get(c.id) ?? 0),
    refs: c.refs ?? [],
  }))

  const segments: LayoutSegment[] = []

  for (const commit of commits) {
    const fromRow = rowIndexMap.get(commit.id) ?? 0
    const fromCol = commitToColumn.get(commit.id) ?? 0
    const fromX = fromCol * COLUMN_WIDTH + CENTER_X
    const fromY = fromRow * ROW_HEIGHT + ROW_HEIGHT / 2

    for (const parentId of commit.parent_ids) {
      const toRow = rowIndexMap.get(parentId)
      if (toRow === undefined) continue

      const toCol = commitToColumn.get(parentId) ?? 0
      const toX = toCol * COLUMN_WIDTH + CENTER_X
      const toY = toRow * ROW_HEIGHT + ROW_HEIGHT / 2

      const color = getColor(Math.max(fromCol, toCol))

      if (fromCol === toCol) {
        segments.push({
          type: 'vertical',
          x1: fromX,
          y1: fromY,
          x2: toX,
          y2: toY,
          color,
        })
      } else {
        segments.push({
          type: 'horizontal',
          x1: fromX,
          y1: fromY,
          x2: toX,
          y2: fromY,
          color,
        })
        segments.push({
          type: 'vertical',
          x1: toX,
          y1: fromY,
          x2: toX,
          y2: toY,
          color,
        })
      }
    }
  }

  const uniqueSegments = segments.filter((seg, idx, self) =>
    self.findIndex(s => s.x1 === seg.x1 && s.y1 === seg.y1 && s.x2 === seg.x2 && s.y2 === seg.y2) === idx
  )

  const columns = Math.max(...Array.from(commitToColumn.values()), 0) + 1

  return {
    columns,
    nodes,
    segments: uniqueSegments,
    totalWidth: computeTotalWidth(columns, nodes),
  }
}