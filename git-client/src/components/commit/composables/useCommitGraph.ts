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
  type: 'straight' | 'curve' | 'fork' | 'merge'
}

export interface CommitGraph {
  nodes: Map<string, GraphNode>
  connections: GraphConnection[]
  maxLane: number
  passThroughLanes: Map<number, number[]>
  rowLanes: Map<number, number[]>
}

const COLORS = [
  '#4fc3f7', '#81c784', '#fff176', '#ff8a65',
  '#ba68c8', '#f06292', '#4db6ac', '#aed581',
  '#90a4ae', '#ffb74d', '#e57373', '#64b5f6',
]

export function getLaneColor(lane: number): string {
  return COLORS[lane % COLORS.length]
}

interface ActiveLane {
  lane: number
  targetCommitId: string
}

export function useCommitGraph(commits: Ref<Commit[]>) {
  const graph = computed<CommitGraph>(() => {
    if (commits.value.length === 0) {
      return { nodes: new Map(), connections: [], maxLane: 0, passThroughLanes: new Map(), rowLanes: new Map() }
    }

    const nodes = new Map<string, GraphNode>()
    const connections: GraphConnection[] = []
    const rowLanes = new Map<number, number[]>()
    const postRowLanes = new Map<number, number[]>()

    const n = commits.value.length
    const idToIdx = new Map<string, number>()
    commits.value.forEach((c, i) => idToIdx.set(c.id, i))

    const childrenOf = new Map<string, Set<string>>()
    for (const c of commits.value) {
      childrenOf.set(c.id, new Set())
    }
    for (const c of commits.value) {
      for (const pid of c.parent_ids) {
        childrenOf.get(pid)?.add(c.id)
      }
    }

    const isTip = (id: string): boolean => {
      const children = childrenOf.get(id) ?? new Set()
      for (const childId of children) {
        if (idToIdx.has(childId)) return false
      }
      return true
    }

    const tips = commits.value.filter(c => isTip(c.id)).map(c => c.id)

    const laneOfCommit = new Map<string, number>()
    const activeLanes: ActiveLane[] = []
    let nextLane = 0

    function allocateLane(): number {
      return nextLane++
    }

    function findLaneForCommit(commitId: string): number | undefined {
      const idx = activeLanes.findIndex(al => al.targetCommitId === commitId)
      return idx >= 0 ? idx : undefined
    }

    function getVisibleParents(parentIds: string[]): string[] {
      return parentIds.filter(pid => idToIdx.has(pid))
    }

    function removeActiveLane(laneIdx: number) {
      activeLanes.splice(laneIdx, 1)
      for (let i = laneIdx; i < activeLanes.length; i++) {
        const oldLane = activeLanes[i].lane
        activeLanes[i].lane = i
        for (const [cid, ln] of laneOfCommit.entries()) {
          if (ln === oldLane) laneOfCommit.set(cid, i)
        }
        for (const conn of connections) {
          if (conn.fromLane === oldLane) conn.fromLane = i
          if (conn.toLane === oldLane) conn.toLane = i
        }
      }
    }

    function insertActiveLane(afterIdx: number, targetCommitId: string): number {
      const newLaneIdx = afterIdx + 1
      for (let i = afterIdx; i < activeLanes.length; i++) {
        const oldLane = activeLanes[i].lane
        activeLanes[i].lane = i + 1
        for (const [cid, ln] of laneOfCommit.entries()) {
          if (ln === oldLane) laneOfCommit.set(cid, i + 1)
        }
        for (const conn of connections) {
          if (conn.fromLane === oldLane) conn.fromLane = i + 1
          if (conn.toLane === oldLane) conn.toLane = i + 1
        }
      }
      activeLanes.splice(newLaneIdx, 0, { lane: newLaneIdx, targetCommitId })
      return newLaneIdx
    }

    for (const tipId of tips) {
      const existing = findLaneForCommit(tipId)
      if (existing === undefined) {
        const lane = allocateLane()
        activeLanes.push({ lane, targetCommitId: tipId })
        laneOfCommit.set(tipId, lane)
      }
    }

    for (let row = 0; row < n; row++) {
      const commit = commits.value[row]
      const currentRowLanes: number[] = []
      for (const al of activeLanes) {
        currentRowLanes.push(al.lane)
      }
      currentRowLanes.sort((a, b) => a - b)

      let myLaneIdx = findLaneForCommit(commit.id)
      let myLane: number

      if (myLaneIdx !== undefined) {
        myLane = activeLanes[myLaneIdx].lane
        laneOfCommit.set(commit.id, myLane)

        const visibleParents = getVisibleParents(commit.parent_ids)

        if (visibleParents.length === 0) {
          removeActiveLane(myLaneIdx)
        } else if (visibleParents.length === 1) {
          activeLanes[myLaneIdx].targetCommitId = visibleParents[0]
          laneOfCommit.set(visibleParents[0], myLane)
          connections.push({
            fromLane: myLane,
            toLane: myLane,
            fromCommitId: commit.id,
            toCommitId: visibleParents[0],
            type: 'straight',
          })
        } else {
          activeLanes[myLaneIdx].targetCommitId = visibleParents[0]
          laneOfCommit.set(visibleParents[0], myLane)
          connections.push({
            fromLane: myLane,
            toLane: myLane,
            fromCommitId: commit.id,
            toCommitId: visibleParents[0],
            type: 'straight',
          })

          for (let p = 1; p < visibleParents.length; p++) {
            const parentLaneIdx = findLaneForCommit(visibleParents[p])
            if (parentLaneIdx !== undefined) {
              const parentLane = activeLanes[parentLaneIdx].lane
              connections.push({
                fromLane: parentLane,
                toLane: myLane,
                fromCommitId: commit.id,
                toCommitId: visibleParents[p],
                type: 'merge',
              })
              removeActiveLane(parentLaneIdx)
              if (parentLaneIdx < myLaneIdx) myLaneIdx--
            } else {
              const newLaneIdx = insertActiveLane(myLaneIdx, visibleParents[p])
              const newLane = activeLanes[newLaneIdx].lane
              laneOfCommit.set(visibleParents[p], newLane)
              connections.push({
                fromLane: newLane,
                toLane: myLane,
                fromCommitId: commit.id,
                toCommitId: visibleParents[p],
                type: 'merge',
              })
              myLaneIdx = newLaneIdx
              myLane = activeLanes[myLaneIdx].lane
              laneOfCommit.set(commit.id, myLane)
            }
          }
        }
      } else {
        const lane = allocateLane()
        activeLanes.push({ lane, targetCommitId: '' })
        laneOfCommit.set(commit.id, lane)
        myLane = lane

        const visibleParents = getVisibleParents(commit.parent_ids)

        if (visibleParents.length === 0) {
          const lastIdx = activeLanes.findIndex(al => al.lane === lane)
          if (lastIdx >= 0) removeActiveLane(lastIdx)
        } else if (visibleParents.length >= 1) {
          const lastIdx = activeLanes.findIndex(al => al.lane === lane)
          if (lastIdx >= 0) {
            activeLanes[lastIdx].targetCommitId = visibleParents[0]
            laneOfCommit.set(visibleParents[0], lane)
          }
          connections.push({
            fromLane: lane,
            toLane: lane,
            fromCommitId: commit.id,
            toCommitId: visibleParents[0],
            type: 'straight',
          })

          for (let p = 1; p < visibleParents.length; p++) {
            const parentLaneIdx = findLaneForCommit(visibleParents[p])
            if (parentLaneIdx !== undefined) {
              const parentLane = activeLanes[parentLaneIdx].lane
              connections.push({
                fromLane: parentLane,
                toLane: lane,
                fromCommitId: commit.id,
                toCommitId: visibleParents[p],
                type: 'merge',
              })
              removeActiveLane(parentLaneIdx)
            } else {
              const newLaneIdx = insertActiveLane(
                activeLanes.findIndex(al => al.lane === lane),
                visibleParents[p],
              )
              const newLane = activeLanes[newLaneIdx].lane
              laneOfCommit.set(visibleParents[p], newLane)
              connections.push({
                fromLane: newLane,
                toLane: lane,
                fromCommitId: commit.id,
                toCommitId: visibleParents[p],
                type: 'merge',
              })
            }
          }
        }
      }

      const children = childrenOf.get(commit.id) ?? new Set()
      const hasVisibleChildren = Array.from(children).some(id => idToIdx.has(id))

      nodes.set(commit.id, {
        commitId: commit.id,
        lane: myLane,
        isMerge: commit.parent_ids.filter(pid => idToIdx.has(pid)).length >= 2,
        hasChildren: hasVisibleChildren,
      })

      rowLanes.set(row, currentRowLanes)

      const postLanes: number[] = []
      for (const al of activeLanes) {
        postLanes.push(al.lane)
      }
      postLanes.sort((a, b) => a - b)
      postRowLanes.set(row, postLanes)
    }

    const activeLanesPerRow = new Map<number, number[]>()
    for (let row = 0; row < n - 1; row++) {
      const currLane = nodes.get(commits.value[row].id)?.lane
      const nextLanes = new Set(postRowLanes.get(row + 1) ?? [])
      const rowActiveLanes = (postRowLanes.get(row) ?? []).filter(
        l => l !== currLane && nextLanes.has(l)
      )
      if (rowActiveLanes.length > 0) {
        activeLanesPerRow.set(row, rowActiveLanes)
      }
    }

    return { nodes, connections, maxLane: nextLane, passThroughLanes: activeLanesPerRow, rowLanes }
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
