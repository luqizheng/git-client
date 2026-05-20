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

interface CommitWithIndex {
  commit: Commit
  rowIndex: number
}

function getBranchChildren(commitId: string, childrenMap: Map<string, string[]>, allCommits: Map<string, CommitWithIndex>): string[] {
  const children = childrenMap.get(commitId) || []
  return children.filter(childId => {
    const child = allCommits.get(childId)
    return child && child.commit.parent_ids[0] === commitId
  })
}

function getMergeChildren(commitId: string, childrenMap: Map<string, string[]>, allCommits: Map<string, CommitWithIndex>): string[] {
  const children = childrenMap.get(commitId) || []
  return children.filter(childId => {
    const child = allCommits.get(childId)
    return child && child.commit.parent_ids[0] !== commitId
  })
}

function allocateColumns(commits: Commit[]): GraphNode[] {
  if (commits.length === 0) return []

  const allCommits = new Map<string, CommitWithIndex>()
  const childrenMap = new Map<string, string[]>()

  for (let i = 0; i < commits.length; i++) {
    const commit = commits[i]
    allCommits.set(commit.id, { commit, rowIndex: i })

    for (const parentId of commit.parent_ids) {
      if (!childrenMap.has(parentId)) {
        childrenMap.set(parentId, [])
      }
      childrenMap.get(parentId)!.push(commit.id)
    }
  }

  const activeBranches: string[] = []
  const nodes: GraphNode[] = []
  const visited = new Set<string>()

  for (let i = 0; i < commits.length; i++) {
    const commit = commits[i]
    if (visited.has(commit.id)) continue

    const branchChildren = getBranchChildren(commit.id, childrenMap, allCommits)

    let branchToReplace: string | null = null
    let branchToReplaceIdx = Infinity

    for (const childId of branchChildren) {
      const idx = activeBranches.indexOf(childId)
      if (idx !== -1 && idx < branchToReplaceIdx) {
        branchToReplace = childId
        branchToReplaceIdx = idx
      }
    }

    if (branchToReplace !== null) {
      activeBranches[branchToReplaceIdx] = commit.id
    } else {
      activeBranches.push(commit.id)
    }

    for (const childId of branchChildren) {
      const idx = activeBranches.indexOf(childId)
      if (idx !== -1 && childId !== branchToReplace) {
        activeBranches[idx] = ''
      }
    }

    const column = activeBranches.indexOf(commit.id)
    const color = BRANCH_COLORS[column % BRANCH_COLORS.length]

    nodes.push({
      commitId: commit.id,
      rowIndex: i,
      column,
      color,
      hasRefs: !!(commit.refs && commit.refs.length > 0),
    })

    visited.add(commit.id)
  }

  for (const childList of childrenMap.values()) {
    for (const childId of childList) {
      if (!visited.has(childId)) {
        const childInfo = allCommits.get(childId)
        if (childInfo) {
          const column = activeBranches.indexOf('')
          if (column === -1) {
            activeBranches.push(childId)
          } else {
            activeBranches[column] = childId
          }

          const color = BRANCH_COLORS[activeBranches.indexOf(childId) % BRANCH_COLORS.length]

          nodes.push({
            commitId: childId,
            rowIndex: childInfo.rowIndex,
            column: activeBranches.indexOf(childId),
            color,
            hasRefs: !!(childInfo.commit.refs && childInfo.commit.refs.length > 0),
          })

          visited.add(childId)
        }
      }
    }
  }

  return nodes.sort((a, b) => a.rowIndex - b.rowIndex)
}

function generateSegments(commits: Commit[], nodes: GraphNode[]): PathSegment[] {
  const segments: PathSegment[] = []
  const nodeMap = new Map(nodes.map(n => [n.commitId, n]))
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

  for (const node of nodes) {
    if (node.rowIndex < 0 || node.rowIndex >= commits.length) continue

    const commit = commits[node.rowIndex]
    const nodeX = node.column * COLUMN_WIDTH + CENTER_X
    const nodeY = node.rowIndex * ROW_HEIGHT + ROW_HEIGHT / 2

    const branchChildren = getBranchChildren(node.commitId, childrenMap, commitMap)
    for (const childId of branchChildren) {
      const childNode = nodeMap.get(childId)
      if (!childNode) continue

      const childX = childNode.column * COLUMN_WIDTH + CENTER_X
      const childY = childNode.rowIndex * ROW_HEIGHT + ROW_HEIGHT / 2

      if (childNode.column === node.column) {
        segments.push({
          type: 'vertical',
          x1: nodeX,
          y1: nodeY + CIRCLE_RADIUS,
          x2: childX,
          y2: childY - CIRCLE_RADIUS,
          color: node.color,
        })
      }
    }

    const mergeChildren = getMergeChildren(node.commitId, childrenMap, commitMap)
    for (const childId of mergeChildren) {
      const childNode = nodeMap.get(childId)
      if (!childNode) continue

      const childX = childNode.column * COLUMN_WIDTH + CENTER_X
      const childY = childNode.rowIndex * ROW_HEIGHT + ROW_HEIGHT / 2

      segments.push({
        type: 'vertical',
        x1: nodeX,
        y1: nodeY + CIRCLE_RADIUS,
        x2: nodeX,
        y2: childY - CIRCLE_RADIUS,
        color: node.color,
      })

      segments.push({
        type: 'horizontal',
        x1: nodeX,
        y1: childY,
        x2: childX,
        y2: childY,
        color: node.color,
      })
    }

    if (commit.parent_ids && commit.parent_ids.length > 0) {
      const firstParentId = commit.parent_ids[0]
      const parentNode = nodeMap.get(firstParentId)

      if (!parentNode) continue

      const parentX = parentNode.column * COLUMN_WIDTH + CENTER_X
      const parentY = parentNode.rowIndex * ROW_HEIGHT + ROW_HEIGHT / 2

      if (parentNode.column === node.column) {
        if (node.rowIndex < commits.length - 1) {
          segments.push({
            type: 'vertical',
            x1: nodeX,
            y1: nodeY + CIRCLE_RADIUS,
            x2: parentX,
            y2: parentY - CIRCLE_RADIUS,
            color: node.color,
          })
        }
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
          y2: parentY - CIRCLE_RADIUS,
          x2: parentX,
          color: node.color,
        })
      }

      for (let i = 1; i < commit.parent_ids.length; i++) {
        const parentId = commit.parent_ids[i]
        const parentNode = nodeMap.get(parentId)
        if (!parentNode) continue

        const parentX = parentNode.column * COLUMN_WIDTH + CENTER_X
        const parentY = parentNode.rowIndex * ROW_HEIGHT + ROW_HEIGHT / 2

        segments.push({
          type: 'vertical',
          x1: nodeX,
          y1: nodeY + CIRCLE_RADIUS,
          x2: nodeX,
          y2: parentY - CIRCLE_RADIUS,
          color: node.color,
        })

        segments.push({
          type: 'horizontal',
          x1: nodeX,
          y1: parentY,
          x2: parentX,
          y2: parentY,
          color: node.color,
        })
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
