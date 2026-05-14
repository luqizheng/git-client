import type { Commit } from '../types/git'

export interface LaneNode {
  commit: Commit
  lane: number
  y: number
  isMerge: boolean
}

export interface LaneLine {
  fromLane: number
  toLane: number
  fromY: number
  toY: number
  color: string
  fromCommitId: string
  toCommitId: string
}

export interface GraphLayout {
  nodes: LaneNode[]
  lines: LaneLine[]
  maxLane: number
  commitLaneMap: Map<string, { lane: number; isMerge: boolean }>
}

const COLORS = [
  '#4fc3f7', '#81c784', '#fff176', '#ff8a65',
  '#ba68c8', '#f06292', '#4db6ac', '#aed581',
  '#90a4ae', '#ffb74d', '#e57373', '#64b5f6',
]

export function getLaneColor(lane: number): string {
  return COLORS[lane % COLORS.length]
}

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

    nodes.push({
      commit,
      lane,
      y: i * rowHeight,
      isMerge: commit.parent_ids.length >= 2,
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
            fromCommitId: commit.id,
            toCommitId: parentId,
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
          fromCommitId: commit.id,
          toCommitId: nextCommit.id,
        })
      }
    }
  }

  const commitLaneMapResult = new Map<string, { lane: number; isMerge: boolean }>()
  for (const node of nodes) {
    commitLaneMapResult.set(node.commit.id, { lane: node.lane, isMerge: node.isMerge })
  }

  return { nodes, lines, maxLane: nextLane, commitLaneMap: commitLaneMapResult }
}
