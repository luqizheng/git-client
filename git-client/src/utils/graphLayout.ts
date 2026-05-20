import type { Commit } from '../types/git'

export interface GraphNode {
  commitId: string
  rowIndex: number
  column: number
  color: string
  hasRefs: boolean
}

export interface PathSegment {
  type: 'vertical' | 'horizontal'
  x1: number
  y1: number
  x2: number
  y2: number
  color: string
}

export interface GraphLayout {
  columns: number
  nodes: GraphNode[]
  segments: PathSegment[]
}

export const COLUMN_WIDTH = 20
export const ROW_HEIGHT = 40
export const CENTER_X = 10
export const CIRCLE_RADIUS = 8

export const BRANCH_COLORS = [
  'var(--branch-color-1)',
  'var(--branch-color-2)',
  'var(--branch-color-3)',
  'var(--branch-color-4)',
  'var(--branch-color-5)',
  'var(--branch-color-6)',
  'var(--branch-color-7)',
  'var(--branch-color-8)',
]

function allocateColumns(commits: Commit[]): GraphNode[] {
  const nodes: GraphNode[] = []
  const activeColumns: Map<number, { color: string; commitId: string }> = new Map()
  let nextColumn = 0

  for (let i = 0; i < commits.length; i++) {
    const commit = commits[i]

    const parentNodes = commit.parent_ids
      .map(pid => nodes.find(n => n.commitId === pid))
      .filter((n): n is GraphNode => n !== undefined)

    const usedColumns = new Set<number>(parentNodes.map(p => p.column))

    for (const [col] of activeColumns) {
      if (!usedColumns.has(col) && !parentNodes.some(p => p.column === col)) {
        activeColumns.delete(col)
      }
    }

    let column: number
    let color: string

    if (parentNodes.length > 0) {
      const firstParent = parentNodes[0]
      column = firstParent.column
      color = firstParent.color
    } else {
      column = nextColumn++
      color = BRANCH_COLORS[column % BRANCH_COLORS.length]
    }

    nodes.push({
      commitId: commit.id,
      rowIndex: i,
      column,
      color,
      hasRefs: !!(commit.refs && commit.refs.length > 0),
    })

    activeColumns.set(column, { color, commitId: commit.id })
  }

  return nodes
}

function generateSegments(commits: Commit[], nodes: GraphNode[]): PathSegment[] {
  const segments: PathSegment[] = []
  const nodeMap = new Map(nodes.map(n => [n.commitId, n]))

  for (const node of nodes) {
    const commit = commits[node.rowIndex]
    const nodeY = node.rowIndex * ROW_HEIGHT + ROW_HEIGHT / 2
    const nodeX = node.column * COLUMN_WIDTH + CENTER_X

    if (node.rowIndex < commits.length - 1) {
      const nextCommit = commits[node.rowIndex + 1]
      const nextNode = nodeMap.get(nextCommit.id)

      if (!nextNode || nextNode.column !== node.column) {
        segments.push({
          type: 'vertical',
          x1: nodeX,
          y1: nodeY + CIRCLE_RADIUS,
          x2: nodeX,
          y2: (node.rowIndex + 1) * ROW_HEIGHT + ROW_HEIGHT / 2 - CIRCLE_RADIUS,
          color: node.color,
        })
      }
    }

    if (commit.parent_ids && commit.parent_ids.length > 0) {
      for (const parentId of commit.parent_ids) {
        const parentNode = nodeMap.get(parentId)
        if (!parentNode) continue

        const parentX = parentNode.column * COLUMN_WIDTH + CENTER_X
        const parentY = parentNode.rowIndex * ROW_HEIGHT + ROW_HEIGHT / 2

        if (parentNode.column === node.column) {
          segments.push({
            type: 'vertical',
            x1: nodeX,
            y1: nodeY + CIRCLE_RADIUS,
            x2: parentX,
            y2: parentY - CIRCLE_RADIUS,
            color: node.color,
          })
        } else {
          segments.push({
            type: 'horizontal',
            x1: nodeX,
            y1: nodeY,
            x2: parentX,
            y2: nodeY,
            color: node.color,
          })

          segments.push({
            type: 'vertical',
            x1: parentX,
            y1: nodeY,
            x2: parentX,
            y2: parentY - CIRCLE_RADIUS,
            color: node.color,
          })
        }
      }
    }
  }

  return segments
}

export function computeGraphLayout(commits: Commit[]): GraphLayout {
  if (commits.length === 0) {
    return { columns: 1, nodes: [], segments: [] }
  }

  const nodes = allocateColumns(commits)
  const segments = generateSegments(commits, nodes)

  const maxColumn = nodes.reduce((max, n) => Math.max(max, n.column), 0)

  return {
    columns: maxColumn + 1,
    nodes,
    segments,
  }
}
