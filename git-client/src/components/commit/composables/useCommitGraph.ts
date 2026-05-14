import { computed, type Ref } from 'vue'
import type { Commit } from '../../../types/git'

export interface GraphNode {
  commitId: string
  lane: number
  isMerge: boolean
  hasChildren: boolean
}

export interface GraphConnection {
  fromLane: number
  toLane: number
  fromCommitId: string
  toCommitId: string
  type: 'straight' | 'curve'
}

export interface CommitGraph {
  nodes: Map<string, GraphNode>
  connections: GraphConnection[]
  maxLane: number
}

const COLORS = [
  '#4fc3f7', '#81c784', '#fff176', '#ff8a65',
  '#ba68c8', '#f06292', '#4db6ac', '#aed581',
  '#90a4ae', '#ffb74d', '#e57373', '#64b5f6',
]

export function getLaneColor(lane: number): string {
  return COLORS[lane % COLORS.length]
}

export function useCommitGraph(commits: Ref<Commit[]>) {
  const graph = computed<CommitGraph>(() => {
    const nodes = new Map<string, GraphNode>()
    const connections: GraphConnection[] = []
    const commitLaneMap = new Map<string, number>()
    let nextLane = 0

    const commitIndexMap = new Map<string, number>()
    commits.value.forEach((c, i) => commitIndexMap.set(c.id, i))

    for (let i = 0; i < commits.value.length; i++) {
      const commit = commits.value[i]
      let lane: number

      if (commitLaneMap.has(commit.id)) {
        lane = commitLaneMap.get(commit.id)!
      } else {
        lane = nextLane
        commitLaneMap.set(commit.id, lane)
        nextLane++
      }

      const hasChildren = commits.value.some((c, idx) =>
        idx < i && c.parent_ids.includes(commit.id)
      )

      nodes.set(commit.id, {
        commitId: commit.id,
        lane,
        isMerge: commit.parent_ids.length >= 2,
        hasChildren,
      })

      for (const parentId of commit.parent_ids) {
        if (!commitLaneMap.has(parentId)) {
          commitLaneMap.set(parentId, lane)
        } else {
          const parentLane = commitLaneMap.get(parentId)!
          if (parentLane !== lane) {
            connections.push({
              fromLane: lane,
              toLane: parentLane,
              fromCommitId: commit.id,
              toCommitId: parentId,
              type: 'curve',
            })
          }
        }
      }

      const nextCommit = commits.value[i + 1]
      if (nextCommit && commit.parent_ids.includes(nextCommit.id)) {
        const nextLane = commitLaneMap.get(nextCommit.id) ?? lane
        connections.push({
          fromLane: lane,
          toLane: nextLane,
          fromCommitId: commit.id,
          toCommitId: nextCommit.id,
          type: 'straight',
        })
      }
    }

    return { nodes, connections, maxLane: nextLane }
  })

  const graphWidth = computed(() => {
    const laneCount = Math.max(graph.value.maxLane, 1)
    return 12 + laneCount * 16 + 12
  })

  return {
    graph,
    graphWidth,
    getLaneColor,
  }
}
