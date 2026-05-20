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
  const commitMap = new Map(commits.map((c, i) => [c.id, { commit: c, rowIndex: i }]))
  const childrenMap = new Map<string, string[]>()

  for (const commit of commits) {
    for (const parentId of commit.parent_ids) {
      if (!childrenMap.has(parentId)) {
        childrenMap.set(parentId, [])
      }
      childrenMap.get(parentId)!.push(commit.id)
    }
  }

  const nodes = new Map<string, GraphNode>()
  let nextColumn = 0

  const toVisit: string[] = []
  const visited = new Set<string>()

  for (const commit of commits) {
    if (commit.parent_ids.length === 0) {
      toVisit.push(commit.id)
    }
  }

  while (toVisit.length > 0) {
    const commitId = toVisit.shift()!
    if (visited.has(commitId)) continue

    const info = commitMap.get(commitId)
    if (!info) continue

    const allParentsProcessed = info.commit.parent_ids.every(
      pid => !commitMap.has(pid) || visited.has(pid)
    )
    if (!allParentsProcessed) {
      toVisit.push(commitId)
      continue
    }

    visited.add(commitId)

    let column: number
    let color: string

    const firstParentId = info.commit.parent_ids[0]
    const firstParentNode = firstParentId ? nodes.get(firstParentId) : undefined

    if (firstParentNode) {
      column = firstParentNode.column
      color = firstParentNode.color
    } else {
      column = nextColumn++
      color = BRANCH_COLORS[column % BRANCH_COLORS.length]
    }

    nodes.set(commitId, {
      commitId,
      rowIndex: info.rowIndex,
      column,
      color,
      hasRefs: !!(info.commit.refs && info.commit.refs.length > 0),
    })

    const children = childrenMap.get(commitId) || []
    for (const childId of children) {
      if (!visited.has(childId)) {
        toVisit.push(childId)
      }
    }
  }

  return Array.from(nodes.values()).sort((a, b) => a.rowIndex - b.rowIndex)
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
